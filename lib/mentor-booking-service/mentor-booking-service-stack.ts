import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from "path";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";


interface MentorBookingServiceStackProps extends StackProps {
    mentorsTable: dynamodb.Table;
    timeSlotsTable: dynamodb.Table;
	bookingsTable: dynamodb.Table;
	studentsTable: dynamodb.Table;
}

export class MentorBookingServiceStack extends Stack {
    constructor(scope: Construct, id: string, props: MentorBookingServiceStackProps) {
        super(scope, id, props);

		//SQS
		const notificationQueue = new Queue(this, 'NotificationsQueue', {
			queueName: 'NotificationsQueue',
            //deo queue???
		});
		

        //tables
        const mentorsTable = props.mentorsTable;
        const timeSlotsTable = props.timeSlotsTable;
		const bookingsTable = props.bookingsTable;
		const studentsTable = props.studentsTable;

        //functions
        const getAllMentorsFunction = new NodejsFunction(this, 'GetAllMentorsFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 256,
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
            memorySize: 256,
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
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './create-booking.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                BOOKINGS_TABLE_NAME: bookingsTable.tableName,
				TIMESLOTS_TABLE_NAME: timeSlotsTable.tableName,
                MENTORS_TABLE_NAME: mentorsTable.tableName,
                STUDENTS_TABLE_NAME: studentsTable.tableName,
				NOTIFICATION_QUEUE_URL: notificationQueue.queueUrl,
            },
      	});

        const deleteBookingFunction = new NodejsFunction(this, 'deleteBookingFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './delete-booking.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                BOOKINGS_TABLE_NAME: bookingsTable.tableName,
				TIMESLOTS_TABLE_NAME: timeSlotsTable.tableName,
                MENTORS_TABLE_NAME: mentorsTable.tableName,
                STUDENTS_TABLE_NAME: studentsTable.tableName,
				NOTIFICATION_QUEUE_URL: notificationQueue.queueUrl,
            },
      	});

		  const notifyAboutBookingFunction = new NodejsFunction(this, 'notifyAboutBookingFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './notify-about-booking.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
				TIMESLOTS_TABLE_NAME: timeSlotsTable.tableName,
                MENTORS_TABLE_NAME: mentorsTable.tableName,
				STUDENTS_TABLE_NAME: studentsTable.tableName,
            },
      	});

		notifyAboutBookingFunction.addEventSource(
			new SqsEventSource(notificationQueue, {
				batchSize: 5,
			})
		);

        //permissions
        mentorsTable.grantReadData(getAllMentorsFunction);
        mentorsTable.grantReadData(getTimeSlotsByMentorFunction);
        mentorsTable.grantReadData(createBookingFunction);
        mentorsTable.grantReadData(deleteBookingFunction);
        timeSlotsTable.grantReadData(getTimeSlotsByMentorFunction);
        timeSlotsTable.grantReadWriteData(createBookingFunction);
        timeSlotsTable.grantReadWriteData(deleteBookingFunction);
        bookingsTable.grantReadWriteData(createBookingFunction);
        bookingsTable.grantReadWriteData(deleteBookingFunction);
        studentsTable.grantReadData(createBookingFunction);
        studentsTable.grantReadData(deleteBookingFunction);
		notificationQueue.grantSendMessages(createBookingFunction);
        notificationQueue.grantSendMessages(deleteBookingFunction);

        //API Gateway
        const api = new apigateway.RestApi(this, 'MentorBookingApi', {
            restApiName: 'Mentor Booking Service',
            description: 'API for Mentor Booking Service',
        });

        const mentorsResource = api.root.addResource('mentors');
        const getAllMentorsIntegration = new apigateway.LambdaIntegration(getAllMentorsFunction);
        mentorsResource.addMethod('GET', getAllMentorsIntegration);

        const mentorIdResource = mentorsResource.addResource('{mentorId}');
        const timeslotsResource = mentorIdResource.addResource('timeslots');
        const getTimeSlotsByMentorIntegration = new apigateway.LambdaIntegration(getTimeSlotsByMentorFunction);
        timeslotsResource.addMethod('GET', getTimeSlotsByMentorIntegration);

        const createBookingResource = api.root.addResource('bookings');
        const createBookingIntegration = new apigateway.LambdaIntegration(createBookingFunction);
        createBookingResource.addMethod('POST', createBookingIntegration);

        const deleteBookingResource = createBookingResource.addResource('{bookingId}');
        const deleteBookingIntegration = new apigateway.LambdaIntegration(deleteBookingFunction);
        deleteBookingResource.addMethod('DELETE', deleteBookingIntegration);

        new CfnOutput(this, 'ApiUrl', {
        	value: api.url,
        });

		new CfnOutput(this, 'NotificationsQueueUrl', {
			value: notificationQueue.queueUrl,
		});

    }
}