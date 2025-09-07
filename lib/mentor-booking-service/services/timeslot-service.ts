import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { TimeSlotEntity } from "../entities/timeslot-entity";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export class TimeSlotService {
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
}
