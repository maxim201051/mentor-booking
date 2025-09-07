import { DynamoDBClient, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { MentorEntity } from "../entities/mentor-entity";
import { dynamodbUtils } from "../utils/dynamodb-utils";


export class MentorService {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly mentorsTableName: string;

    constructor(mentorsTableName: string, region?: string) {
        this.mentorsTableName = mentorsTableName;
        this.dynamoDBClient = new DynamoDBClient({ region: region });
    }

    async queryMentorsWithFilters(queryParams: any): Promise<MentorEntity[]> {
        try {
          const filters = new Map(Object.entries(queryParams));
          const searchParams = dynamodbUtils.createMentorSearchParams(filters);
          console.log(searchParams)
          const mentorsScanCommand = new ScanCommand({
            TableName: this.mentorsTableName,
            ...searchParams,
          });
          console.log(mentorsScanCommand)

          const mentorsResponse = await this.dynamoDBClient.send(mentorsScanCommand);
          console.log(mentorsResponse)
          const mentors = mentorsResponse.Items?.map(item => unmarshall(item) as MentorEntity) || [];
    
          return mentors;
        } catch (error: any) {
          console.error("Error fetching all mentors:", error);
          throw new Error("Could not fetch mentors");
        }
    }

    async isMentorExist(mentorId: string): Promise<boolean> {
        try {
          const command = new GetItemCommand({
            TableName: this.mentorsTableName,
            Key: {
              id: { S: mentorId },
            },
          });
    
          const result = await this.dynamoDBClient.send(command);
    
          return result.Item ? true : false;
        } catch (error) {
          console.error('Error checking mentor existence:', error);
          throw new Error('Failed to check mentor existence');
        }
    }
}