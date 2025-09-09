import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TimeSlotEntity } from "../entities/timeslot-entity";
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

    async updateTimeSlotIsBookedStatus(timeslotId: string, isBooked: boolean): Promise<void> {
        const command = new UpdateCommand({
            TableName: this.timeSlotsTableName,
            Key: {
                id: { S: timeslotId },
            },
            UpdateExpression: "set isBooked = :isBooked",
            ExpressionAttributeValues: {
              ":isBooked": isBooked,
            },
            ReturnValues: "ALL_NEW",
        });
        
        await this.dynamoDBClient.send(command);
    }
}