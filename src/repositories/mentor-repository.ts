import { DynamoDBClient, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { MentorEntity } from "../entities/mentor-entity";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { dynamodbUtils } from "../utils/dynamodb-utils";

export class MentorRepository {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly mentorsTableName: string;

    constructor(mentorsTableName: string, dynamoDBClient: DynamoDBClient) {
        this.mentorsTableName = mentorsTableName;
        this.dynamoDBClient = dynamoDBClient;
    }

    async getMentorById(mentorId: string): Promise<MentorEntity|null> {
        try {
          const command = new GetItemCommand({
            TableName: this.mentorsTableName,
            Key: {
              id: { S: mentorId },
            },
          });
    
          const mentorResponse = await this.dynamoDBClient.send(command);
    
          return mentorResponse.Item ? (unmarshall(mentorResponse.Item) as MentorEntity) : null
        } catch (error) {
			console.error(`Error getting mentor by ID ${mentorId}:`, error);
            throw new Error(`Failed to get mentor by ID ${mentorId}`);
        }
    }

    async queryMentorsWithFilters(queryParams: any): Promise<MentorEntity[]> {
        try {
            const filters = new Map(Object.entries(queryParams));
            const searchParams = dynamodbUtils.createMentorSearchParams(filters);
            const mentorsQueryCommand = new ScanCommand({
                TableName: this.mentorsTableName,
                ...searchParams,
            });

            const mentorsResponse = await this.dynamoDBClient.send(mentorsQueryCommand);
            const mentors = mentorsResponse.Items?.map(item => unmarshall(item) as MentorEntity) || [];
        
            return mentors;
            } catch (error: any) {
            console.error("Error fetching all mentors:", error);
            throw new Error("Could not fetch mentors");
        }
    }

}