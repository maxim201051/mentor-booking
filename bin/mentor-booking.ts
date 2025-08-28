#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MentorBookingServiceStack } from '../lib/mentor-booking-service/mentor-booking-service-stack';
import * as dotenv from 'dotenv';
import { DynamoDbStack } from '../lib/dynamodb/dynamodb-stack';

dotenv.config();

const app = new cdk.App();
const dynamoDbStack = new DynamoDbStack(app, 'DynamoDbStack');
new MentorBookingServiceStack(app, 'MentorBookingServiceStack', {
    env: {
        region: process.env.REGION,
    },
    mentorsTable: dynamoDbStack.mentorsTable,
});
