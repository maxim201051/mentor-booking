import { MentorService } from "./services/mentor-service";


const mentorService = new MentorService(
    process.env.MENTORS_TABLE_NAME || '',
    process.env.REGION 
);

export const main = async () => {
    try {
        const mentors = await mentorService.getAllMentors();
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