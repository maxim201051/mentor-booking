#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { MentorBookingServiceStack } from '../lib/mentor-booking-service-stack';
import { DynamoDbStack } from '../lib/dynamodb-stack';

dotenv.config();

const app = new cdk.App();
const dynamoDbStack = new DynamoDbStack(app, 'DynamoDbStack');
new MentorBookingServiceStack(app, 'MentorBookingServiceStack', {
    env: {
        region: process.env.REGION,
    },
    mentorsTable: dynamoDbStack.mentorsTable,
    timeSlotsTable: dynamoDbStack.timeSlotsTable,
    bookingsTable: dynamoDbStack.bookingsTable,
    studentsTable: dynamoDbStack.studentsTable,
});
