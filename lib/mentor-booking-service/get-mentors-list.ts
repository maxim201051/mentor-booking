import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { MentorRepository } from "./repositories/mentor-repository";
import { MentorService } from "./services/mentor-service";

const dynamoDBClient = new DynamoDBClient({ 
    region: process.env.REGION 
});

const mentorService = new MentorService(
    new MentorRepository(
        process.env.MENTORS_TABLE_NAME || '',
        dynamoDBClient,
    ),
);

export const main = async (event: any) => {
    return await handleGetMentorsList(event, { mentorService })
}

export const handleGetMentorsList = async (event: any, dependencies: { mentorService: MentorService; }) => {
    try {
        const queryParams = event.queryStringParameters || {};
        const mentors = await dependencies.mentorService.queryMentorsWithFilters(queryParams);
        return {
            statusCode: 200,
            body: JSON.stringify(mentors),
        };
    } catch (error) {
        console.error('Error in getAllMentors handler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
}