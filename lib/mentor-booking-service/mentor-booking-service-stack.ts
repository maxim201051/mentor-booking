import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from "path";


interface MentorBookingServiceStackProps extends StackProps {
    mentorsTable: dynamodb.Table;
    timeSlotsTable: dynamodb.Table;
	bookingsTable: dynamodb.Table;
}

export class MentorBookingServiceStack extends Stack {
    constructor(scope: Construct, id: string, props: MentorBookingServiceStackProps) {
        super(scope, id, props);

        //tables
        const mentorsTable = props.mentorsTable;
        const timeSlotsTable = props.timeSlotsTable;
		const bookingsTable = props.bookingsTable;

        //functions
        const getAllMentorsFunction = new NodejsFunction(this, 'GetAllMentorsFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './get-mentors-list.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                MENTORS_TABLE_NAME: mentorsTable.tableName,
            },
        });

        const getTimeSlotsByMentorFunction = new NodejsFunction(this, 'GetTimeSlotsByMentorFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './get-timeslots-by-mentor.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                TIMESLOTS_TABLE_NAME: timeSlotsTable.tableName,
                MENTORS_TABLE_NAME: mentorsTable.tableName,
            },
        });

        const createBookingFunction = new NodejsFunction(this, 'CreateBookingFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './create-booking.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                BOOKINGS_TABLE_NAME: bookingsTable.tableName,
				TIMESLOTS_TABLE_NAME: timeSlotsTable.tableName,
                MENTORS_TABLE_NAME: mentorsTable.tableName,
            },
      	});

        const deleteBookingFunction = new NodejsFunction(this, 'deleteBookingFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './delete-booking.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                BOOKINGS_TABLE_NAME: bookingsTable.tableName,
                TIMESLOTS_TABLE_NAME: timeSlotsTable.tableName,
            },
      	});

        //permissions
        mentorsTable.grantReadData(getAllMentorsFunction);
        mentorsTable.grantReadData(getTimeSlotsByMentorFunction);
        mentorsTable.grantReadData(createBookingFunction);
        timeSlotsTable.grantReadData(getTimeSlotsByMentorFunction);
        timeSlotsTable.grantReadWriteData(createBookingFunction);
        timeSlotsTable.grantReadWriteData(deleteBookingFunction);
        bookingsTable.grantReadWriteData(createBookingFunction);
        bookingsTable.grantReadWriteData(deleteBookingFunction);

        //API Gateway
        const api = new apigateway.RestApi(this, 'MentorBookingApi', {
            restApiName: 'Mentor Booking Service',
            description: 'API for Mentor Booking Service',
        });

        const mentorsResource = api.root.addResource('mentors');
        const getAllMentorsIntegration = new apigateway.LambdaIntegration(getAllMentorsFunction, {
            integrationResponses: [
                {
                  statusCode: '200',
                  responseTemplates: {
                    'application/json': '{"status": "success", "data": $input.json("$")}',
                  },
                },
                {
                  statusCode: '500',
                  selectionPattern: '5\\d{2}', // Match any 5xx errors
                  responseTemplates: {
                    'application/json': '{"status": "error", "message": "Internal Server Error"}',
                  },
                },
            ],
        })
        mentorsResource.addMethod('GET', getAllMentorsIntegration, {
            methodResponses: [
                { statusCode: '200' },
                { statusCode: '500' },
            ],
        });

        const mentorIdResource = mentorsResource.addResource('{mentorId}');
        const timeslotsResource = mentorIdResource.addResource('timeslots');
        const getTimeSlotsByMentorIntegration = new apigateway.LambdaIntegration(getTimeSlotsByMentorFunction, {
            integrationResponses: [
                {
                  statusCode: '200',
                  responseTemplates: {
                    'application/json': '{"status": "success", "data": $input.json("$")}',
                  },
                },
                {
                    statusCode: '400',
                    selectionPattern: '4\\d{2}', // Match any 4xx errors
                    responseTemplates: {
                      'application/json': '{"status": "error", "message": "Mentor id is not provided or mentor with such id does not exist"}',
                    },
                  },
                {
                  statusCode: '500',
                  selectionPattern: '5\\d{2}', // Match any 5xx errors
                  responseTemplates: {
                    'application/json': '{"status": "error", "message": "Internal Server Error"}',
                  },
                },
            ],
            requestTemplates: {
                'application/json': JSON.stringify({
                  pathParameters: {
                    id: "$input.params('id')",
                  },
                }),
            },
        })
        timeslotsResource.addMethod('GET', getTimeSlotsByMentorIntegration, {
            methodResponses: [
                { statusCode: '200' },
                { statusCode: '400' },
                { statusCode: '500' },
            ],
        });

        const createBookingResource = api.root.addResource('bookings');
        const createBookingIntegration = new apigateway.LambdaIntegration(createBookingFunction);
        createBookingResource.addMethod('POST', createBookingIntegration);

        const deleteBookingResource = createBookingResource.addResource('{bookingId}');
        const deleteBookingIntegration = new apigateway.LambdaIntegration(deleteBookingFunction);
        deleteBookingResource.addMethod('DELETE', deleteBookingIntegration);

        new CfnOutput(this, 'ApiUrl', {
        value: api.url,
        });
    }
}