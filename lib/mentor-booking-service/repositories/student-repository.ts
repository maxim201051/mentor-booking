import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { StudentEntity } from "../entities/student-entity";

export class StudentRepository {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly studentsTableName: string;

    constructor(studentsTableName: string, region?: string) {
        this.studentsTableName = studentsTableName;
        this.dynamoDBClient = new DynamoDBClient({ region: region });
    }

    async getStudentById(studentId: string): Promise<StudentEntity|null> {
        try {
          const command = new GetItemCommand({
            TableName: this.studentsTableName,
            Key: {
              id: { S: studentId },
            },
          });
    
          const studentResponse = await this.dynamoDBClient.send(command);
    
          return studentResponse.Item ? (unmarshall(studentResponse.Item) as StudentEntity) : null
        } catch (error) {
			console.error(`Error getting student by ID ${studentId}:`, error);
            throw new Error(`Failed to get student by ID ${studentId}`);
        }
    }

}
