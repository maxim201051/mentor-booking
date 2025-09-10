import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TimeSlotEntity, TimeSlotSchema } from "../entities/timeslot-entity";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export class TimeSlotRepository {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly timeSlotsTableName: string;

    constructor(timeSlotsTableName: string, region?: string) {
        this.timeSlotsTableName = timeSlotsTableName;
        this.dynamoDBClient = new DynamoDBClient({ region: region });
    }

    async getTimeslotsByMentor(mentorId: string): Promise<TimeSlotEntity[]> {
        try {
            const queryTimeSlotsCommand = new QueryCommand({
                TableName: this.timeSlotsTableName,
                IndexName: 'MentorTimeSlotsIndex',
                KeyConditionExpression: 'mentorId = :mentorId',
                ExpressionAttributeValues: {
                    ':mentorId': { S: mentorId },
                },
            });
        
            const timeSlotsResponse = await this.dynamoDBClient.send(queryTimeSlotsCommand);
        
            const timeSlots = timeSlotsResponse.Items?.map((item) => unmarshall(item) as TimeSlotEntity) || [];
        
            return timeSlots;
        } catch (error: any) {
          console.error(`Error fetching time slots for mentor with ID ${mentorId}:`, error);
          throw new Error(`Could not fetch time slots for mentor with ID ${mentorId}`);
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

    async updateTimeSlotIsBookedStatus(timeslotId: string, isBooked: boolean): Promise<void> {
        try {
            const command = new UpdateCommand({
                TableName: this.timeSlotsTableName,
                Key: {
                    id: timeslotId,
                },
                UpdateExpression: "set isBooked = :isBooked",
                ExpressionAttributeValues: {
                  ":isBooked": isBooked,
                },
                ReturnValues: "ALL_NEW",
            });
            
            await this.dynamoDBClient.send(command);
        } catch (error) {
            console.error(`Error updating isBooked status of time slot ${timeslotId}:`, error);
            throw new Error(`Could not update isBooked status of time slot ${timeslotId}`);
        }
    }
}