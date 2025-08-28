import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path from "path";


interface MentorBookingServiceStackProps extends StackProps {
    mentorsTable: dynamodb.Table;
}

export class MentorBookingServiceStack extends Stack {
    constructor(scope: Construct, id: string, props: MentorBookingServiceStackProps) {
        super(scope, id, props);

        //tables
        const mentorsTable = props.mentorsTable;

        //functions
        const getAllMentorsFunction = new NodejsFunction(this, 'GetAllMentorsFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: path.join(__dirname, './get-mentors-list.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                MENTORS_TABLE_NAME: mentorsTable.tableName,
            },
        });

        //permissions
        mentorsTable.grantReadData(getAllMentorsFunction);

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
                    'application/json': '{"status": "error", "message": "Could not fetch mentors"}',
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

        new CfnOutput(this, 'ApiUrl', {
        value: api.url,
        });
    }
}