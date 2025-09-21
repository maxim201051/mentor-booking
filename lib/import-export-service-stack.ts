import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { join } from "path";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { Topic } from "aws-cdk-lib/aws-sns";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";


interface ImportExportServiceStackProps extends StackProps {
    api: RestApi;
    mentorsTable: Table;
    deadLetterQueue: Queue;
}

export class ImportExportServiceStack extends Stack {
    constructor(scope: Construct, id: string, props: ImportExportServiceStackProps) {
        super(scope, id, props);

        //sns
        const importExportTopic = new Topic(this, 'ImportExportTopic', {
            displayName: 'Import-Export Notifications',
        });

        //sqs
        const importExportNotificationsQueue = new Queue(this, 'ImportExportNotificationsQueue', {
			queueName: 'ImportExportNotificationsQueue',
            deadLetterQueue: {
                queue: props.deadLetterQueue,
                maxReceiveCount: 3,
            },
		});

        //s3
        const importBucket = new Bucket(this, "ImportBucket", {
            removalPolicy: RemovalPolicy.DESTROY, 
            autoDeleteObjects: true,                 
        });
        
        //tables
        const mentorsTable = props.mentorsTable;

        //functions
        const uploadMentorsFunction = new NodejsFunction(this, 'UploadMentorsFunction', {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: join(__dirname, '../src/handlers/upload-mentors.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                UPLOAD_MENTORS_BUCKET_NAME: importBucket.bucketName,
            },
      	});

        const processUploadFunction = new NodejsFunction(this, 'ProcessUploadFunction', {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: join(__dirname, '../src/handlers/process-upload.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                UPLOAD_MENTORS_BUCKET_NAME: importBucket.bucketName,
                MENTORS_TABLE_NAME: mentorsTable.tableName,
                IMPORT_EXPORT_NOTIFICATIONS_QUEUE_URL: importExportNotificationsQueue.queueUrl,
            },
      	});

        const notifyAboutMentorsImportFunction = new NodejsFunction(this, "NotifyAboutMentorsImportFunction", {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: join(__dirname, '../src/handlers/notify-about-import-export.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                IMPORT_EXPORT_TOPIC_ARN: importExportTopic.topicArn,
            },
        });

        notifyAboutMentorsImportFunction.addEventSource(
			new SqsEventSource(importExportNotificationsQueue, {
				batchSize: 5,
			})
		);

        //permissions
        importBucket.grantPut(uploadMentorsFunction);
        importBucket.grantRead(processUploadFunction);
        mentorsTable.grantWriteData(processUploadFunction); 
        importExportNotificationsQueue.grantSendMessages(processUploadFunction);
        importExportNotificationsQueue.grantConsumeMessages(notifyAboutMentorsImportFunction); 
        importExportTopic.grantPublish(notifyAboutMentorsImportFunction); 

        importBucket.addEventNotification(
            EventType.OBJECT_CREATED_PUT,
            new LambdaDestination(processUploadFunction)
        );
        
        //API Gateway
        const api = props.api;
        const importResource = api.root.addResource('import');
        const importMentorsResource = importResource.addResource('mentors');
        const importMentorsIntegration = new LambdaIntegration(uploadMentorsFunction);
        importMentorsResource.addMethod('POST', importMentorsIntegration);

    }
}