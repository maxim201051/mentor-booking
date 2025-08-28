import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from "constructs";

export class DynamoDbStack extends Stack {
    public readonly bookingsTable: dynamodb.Table;
    public readonly mentorsTable: dynamodb.Table;
    public readonly studentsTable: dynamodb.Table;
    public readonly timeSlotsTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
    
        this.bookingsTable = new dynamodb.Table(this, 'BookingsTable', {
          tableName: 'bookings',
          partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
          billingMode: dynamodb.BillingMode.PROVISIONED,
          readCapacity: 5,
          writeCapacity: 5,
        });
    
        this.bookingsTable.addGlobalSecondaryIndex({
          indexName: 'StudentBookingsIndex',
          partitionKey: { name: 'studentId', type: dynamodb.AttributeType.STRING },
          projectionType: dynamodb.ProjectionType.ALL,
          readCapacity: 5,
          writeCapacity: 5,
        });
    
        this.bookingsTable.addGlobalSecondaryIndex({
          indexName: 'MentorBookingsIndex',
          partitionKey: { name: 'mentorId', type: dynamodb.AttributeType.STRING },
          projectionType: dynamodb.ProjectionType.ALL,
          readCapacity: 5,
          writeCapacity: 5,
        });
    
        this.mentorsTable = new dynamodb.Table(this, 'MentorsTable', {
          tableName: 'mentors',
          partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
          billingMode: dynamodb.BillingMode.PROVISIONED,
          readCapacity: 5,
          writeCapacity: 5,
        });
    
        this.studentsTable = new dynamodb.Table(this, 'StudentsTable', {
          tableName: 'students',
          partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
          billingMode: dynamodb.BillingMode.PROVISIONED,
          readCapacity: 5,
          writeCapacity: 5,
        });
    
        this.timeSlotsTable = new dynamodb.Table(this, 'TimeslotsTable', {
          tableName: 'timeslots',
          partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
          billingMode: dynamodb.BillingMode.PROVISIONED,
          readCapacity: 5,
          writeCapacity: 5,
        });
    
        this.timeSlotsTable.addGlobalSecondaryIndex({
          indexName: 'MentorTimeSlotsIndex',
          partitionKey: { name: 'mentorId', type: dynamodb.AttributeType.STRING },
          projectionType: dynamodb.ProjectionType.ALL,
          readCapacity: 5,
          writeCapacity: 5,
        });
    
        new CfnOutput(this, 'BookingsTableName', { value: this.bookingsTable.tableName });
        new CfnOutput(this, 'MentorsTableName', { value: this.mentorsTable.tableName });
        new CfnOutput(this, 'StudentsTableName', { value: this.studentsTable.tableName });
        new CfnOutput(this, 'TimeslotsTableName', { value: this.timeSlotsTable.tableName });
    }
}