import { MentorRepository } from "./repositories/mentor-repository";
import { MentorService } from "./services/mentor-service";


const mentorService = new MentorService(
    new MentorRepository(
        process.env.MENTORS_TABLE_NAME || '',
        process.env.REGION
    ),
);

export const main = async (event: any) => {
    try {
        const queryParams = event.queryStringParameters || {};
        const mentors = await mentorService.queryMentorsWithFilters(queryParams);
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