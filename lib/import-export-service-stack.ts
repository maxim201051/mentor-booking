import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
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
    timeSlotsTable: Table;
	bookingsTable: Table;
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

        const bookingExportQueue = new Queue(this, 'BookingExportQueue', {
			queueName: 'BookingExportQueue',
            deadLetterQueue: {
                queue: props.deadLetterQueue,
                maxReceiveCount: 3,
            },
		});

        //s3
        const importExportBucket = new Bucket(this, "ImportExportBucket", {
            removalPolicy: RemovalPolicy.DESTROY, 
            autoDeleteObjects: true,                 
        });
        
        //tables
        const mentorsTable = props.mentorsTable;
        const timeSlotsTable = props.timeSlotsTable;
		const bookingsTable = props.bookingsTable;

        //functions
        const uploadMentorsFunction = new NodejsFunction(this, 'UploadMentorsFunction', {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: join(__dirname, '../src/handlers/upload-mentors.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                IMPORT_EXPORT_BUCKET_NAME: importExportBucket.bucketName,
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
                IMPORT_EXPORT_BUCKET_NAME: importExportBucket.bucketName,
                MENTORS_TABLE_NAME: mentorsTable.tableName,
                IMPORT_EXPORT_NOTIFICATIONS_QUEUE_URL: importExportNotificationsQueue.queueUrl,
            },
      	});

        const notifyAboutImportExportFunction = new NodejsFunction(this, "NotifyAboutImportExportFunction", {
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

        const triggerBookingExportFunction = new NodejsFunction(this, "TriggerBookingExportFunction", {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: join(__dirname, '../src/handlers/trigger-booking-export.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                BOOKING_EXPORT_QUEUE_URL: bookingExportQueue.queueUrl,
            },
        });

        const exportBookingFunction = new NodejsFunction(this, "ExportBookingFunction", {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 256,
            timeout: Duration.seconds(5),
            handler: 'main',
            entry: join(__dirname, '../src/handlers/export-bookings.ts'),
            environment: {
                REGION: process.env.REGION || "eu-west-2",
                TIMESLOTS_TABLE_NAME: timeSlotsTable.tableName,
                BOOKINGS_TABLE_NAME: bookingsTable.tableName,
                IMPORT_EXPORT_NOTIFICATIONS_QUEUE_URL: importExportNotificationsQueue.queueUrl,
                IMPORT_EXPORT_BUCKET_NAME: importExportBucket.bucketName,
            },
        });

        notifyAboutImportExportFunction.addEventSource(
			new SqsEventSource(importExportNotificationsQueue, {
				batchSize: 5,
			})
		);

        exportBookingFunction.addEventSource(
            new SqsEventSource(bookingExportQueue, {
				batchSize: 5,
			})
        );

        //permissions
        importExportBucket.grantPut(uploadMentorsFunction);
        importExportBucket.grantRead(processUploadFunction);
        importExportBucket.grantPut(exportBookingFunction);
        importExportBucket.grantRead(exportBookingFunction);
        mentorsTable.grantWriteData(processUploadFunction); 
        bookingsTable.grantReadData(exportBookingFunction);
        importExportNotificationsQueue.grantSendMessages(exportBookingFunction);
        importExportNotificationsQueue.grantSendMessages(processUploadFunction);
        importExportNotificationsQueue.grantConsumeMessages(notifyAboutImportExportFunction); 
        importExportTopic.grantPublish(notifyAboutImportExportFunction); 
        bookingExportQueue.grantSendMessages(triggerBookingExportFunction);
        bookingExportQueue.grantConsumeMessages(exportBookingFunction);

        importExportBucket.addEventNotification(
            EventType.OBJECT_CREATED_PUT,
            new LambdaDestination(processUploadFunction)
        );
        
        //API Gateway
        const api = props.api;
        const importResource = api.root.addResource('import');
        const importMentorsResource = importResource.addResource('mentors');
        const importMentorsIntegration = new LambdaIntegration(uploadMentorsFunction);
        importMentorsResource.addMethod('POST', importMentorsIntegration);

        const exportResource = api.root.addResource("export");
        const exportBookingsResource = exportResource.addResource("bookings");
        const exportBookingsIntegration = new LambdaIntegration(triggerBookingExportFunction);
        exportBookingsResource.addMethod('POST', exportBookingsIntegration);
    }
}