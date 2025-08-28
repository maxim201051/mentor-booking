import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { MentorEntity } from "../entities/mentor-entity";


export class MentorService {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly mentorsTableName: string;

    constructor(mentorsTableName: string, region?: string) {
        this.mentorsTableName = mentorsTableName;
        this.dynamoDBClient = new DynamoDBClient({ region: region });
    }

    async getAllMentors(): Promise<MentorEntity[]> {
        try {
          const mentorsScanCommand = new ScanCommand({
            TableName: this.mentorsTableName,
          });

          const mentorsResponse = await this.dynamoDBClient.send(mentorsScanCommand);
    
          const mentors = mentorsResponse.Items?.map(item => unmarshall(item) as MentorEntity) || [];
    
          return mentors;
        } catch (error: any) {
          console.error("Error fetching all mentors:", error);
          throw new Error("Could not fetch mentors");
        }
    }
}