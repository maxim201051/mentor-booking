#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { MentorBookingServiceStack } from '../lib/mentor-booking-service-stack';
import { DynamoDbStack } from '../lib/dynamodb-stack';
import { ImportExportServiceStack } from '../lib/import-export-service-stack';
import { SharedResourcesStack } from '../lib/shared-resources-stack';

dotenv.config();

const app = new cdk.App();
const dynamoDbStack = new DynamoDbStack(app, 'DynamoDbStack');
const sharedResourcesStack = new SharedResourcesStack(app, 'SharedResourcesStack');
const mentorBookingServiceStack = new MentorBookingServiceStack(app, 'MentorBookingServiceStack', {
    env: {
        region: process.env.REGION,
    },
    mentorsTable: dynamoDbStack.mentorsTable,
    timeSlotsTable: dynamoDbStack.timeSlotsTable,
    bookingsTable: dynamoDbStack.bookingsTable,
    studentsTable: dynamoDbStack.studentsTable,
    deadLetterQueue: sharedResourcesStack.deadLetterQueue,
});
new ImportExportServiceStack(app, 'ImportExportServiceStack', {
    env: {
        region: process.env.REGION,
    },
    api: mentorBookingServiceStack.api,
    mentorsTable: dynamoDbStack.mentorsTable,
    deadLetterQueue: sharedResourcesStack.deadLetterQueue,
    bookingsTable: dynamoDbStack.bookingsTable,
    timeSlotsTable: dynamoDbStack.timeSlotsTable,
})
