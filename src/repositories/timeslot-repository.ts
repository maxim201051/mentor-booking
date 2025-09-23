import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TimeSlotEntity, TimeSlotSchema } from "../entities/timeslot-entity";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export class TimeSlotRepository {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly timeSlotsTableName: string;

    constructor(timeSlotsTableName: string, dynamoDBClient: DynamoDBClient) {
        this.timeSlotsTableName = timeSlotsTableName;
        this.dynamoDBClient = dynamoDBClient;
    }

    async getUpcomingTimeslotsByMentor(mentorId: string): Promise<TimeSlotEntity[]> {
        try {
            const queryTimeSlotsCommand = new QueryCommand({
                TableName: this.timeSlotsTableName,
                IndexName: 'MentorTimeSlotsIndex',
                KeyConditionExpression: 'mentorId = :mentorId',
                FilterExpression: 'isBooked = :isBooked AND startDate > :currentDate',
                ExpressionAttributeValues: {
                    ':mentorId': { S: mentorId },
                    ':isBooked': { BOOL: false },
                    ':currentDate' : { S: new Date().toISOString() }
                },
            });
        
            const timeSlotsResponse = await this.dynamoDBClient.send(queryTimeSlotsCommand);
        
            const timeSlots = timeSlotsResponse.Items?.map((item) => unmarshall(item) as TimeSlotEntity) || [];
        
            return timeSlots;
        } catch (error: any) {
          console.error(`Error fetching upcoming time slots for mentor with ID ${mentorId}:`, error);
          throw new Error(`Could not fetch upcoming time slots for mentor with ID ${mentorId}`);
        }
    }

    async getTimeSlotById(timeslotId: string): Promise<TimeSlotEntity|null> {
        try {
            const command = new GetItemCommand({
                TableName: this.timeSlotsTableName,
                Key: {
                  id: { S: timeslotId },
                },
              });
        
              const timeSlotResponse = await this.dynamoDBClient.send(command);
        
              return timeSlotResponse.Item ? TimeSlotSchema.parse(unmarshall(timeSlotResponse.Item) as TimeSlotEntity) : null
        } catch (error) {
            console.error(`Error fetching time slot for ID ${timeslotId}:`, error);
            throw new Error(`Could not fetch time slot for ID ${timeslotId}`);
        }
    }

    async updateTimeSlot(timeslot: TimeSlotEntity): Promise<void> {
        try {
            const command = new UpdateCommand({
                TableName: this.timeSlotsTableName,
                Key: {
                    id: timeslot.id,
                },
                UpdateExpression: "set mentorId = :mentorId, startDate = :startDate, endDate = :endDate, isBooked = :isBooked",
                ExpressionAttributeValues: {
                    ":mentorId": timeslot.mentorId,
                    ":startDate": timeslot.startDate.toISOString(),
                    ":endDate": timeslot.endDate.toISOString(),
                    ":isBooked": timeslot.isBooked,
                },
                ReturnValues: "ALL_NEW",
            });
            
            await this.dynamoDBClient.send(command);
        } catch (error) {
            console.error(`Error updating isBooked status of time slot ${timeslot.id}:`, error);
            throw new Error(`Could not update isBooked status of time slot ${timeslot.id}`);
        }
    }

    async deleteTimeslotById(timeslotId: string): Promise<void> {
        try {
            const command = new DeleteCommand({
                TableName: this.timeSlotsTableName,
                Key: {
                    id: timeslotId,
                },
            });
            await this.dynamoDBClient.send(command);
        } catch (error) {
            console.error(`Error deleting timeslot by ID ${timeslotId}:`, error);
            throw new Error(`Failed to delete timeslot by ID ${timeslotId}`);
        }
    }

    async getOverlappingTimeSlotsByMentor(mentorId: string, startDate: Date, endDate: Date): Promise<TimeSlotEntity[]> {
        try {
            const queryTimeSlotsCommand = new QueryCommand({
                TableName: this.timeSlotsTableName,
                IndexName: 'MentorTimeSlotsIndex',
                KeyConditionExpression: 'mentorId = :mentorId',
                FilterExpression: 'startDate <= :endDate AND endDate >= :startDate',
                ExpressionAttributeValues: {
                    ':mentorId': { S: mentorId },
                    ':startDate' : { S: startDate.toISOString() },
                    ':endDate' : { S: endDate.toISOString() }
                },
            });
        
            const timeSlotsResponse = await this.dynamoDBClient.send(queryTimeSlotsCommand);
        
            const timeSlots = timeSlotsResponse.Items?.map((item) => unmarshall(item) as TimeSlotEntity) || [];
        
            return timeSlots;
        } catch (error: any) {
          console.error(`Error fetching overlapping time slots for mentor with ID ${mentorId}:`, error);
          throw new Error(`Could not fetch overlapping time slots for mentor with ID ${mentorId}`);
        }
    }

    async createTimeslot(timeslot: TimeSlotEntity): Promise<void> {
        try {
            const command = new PutItemCommand({
                TableName: this.timeSlotsTableName,
                Item: marshall({
                    ...timeslot,
                    startDate: timeslot.startDate.toISOString(),
                    endDate: timeslot.endDate.toISOString(),
                  }),
            });
            await this.dynamoDBClient.send(command);
        } catch (error) {
            console.error('Error creating timeslot:', error);
            throw new Error('Failed to create timeslot');
        }
    }

}