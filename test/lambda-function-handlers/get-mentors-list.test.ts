import { MentorService } from "../../src/services/mentor-service";
import { MentorEntity } from "../../src/entities/mentor-entity";
import { handleGetMentorsList } from "../../src/handlers/get-mentors-list";

describe("handleGetMentorsList Tests", () => {
    let mockMentorService: jest.Mocked<MentorService>;

    beforeEach(() => {
        mockMentorService = {
            queryMentorsWithFilters: jest.fn(), 
        } as unknown as jest.Mocked<MentorService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mentors: MentorEntity[] = [
        {
            id: "mentor-1",
            email: "mentor@example.com",
            fullName: "John Mentor",
            skills: ["JavaScript", "AWS"],
            experience: 5,
        },
        {
            id: "mentor-2",
            email: "jane.smith@example.com",
            fullName: "Jane Smith",
            skills: ["Python", "Machine Learning"],
            experience: 8,
        },
    ];

    test("handleGetMentorsList should retrieve all mentors without query parameters", async () => {
        mockMentorService.queryMentorsWithFilters.mockResolvedValueOnce(mentors);

        const eventWithoutQueryParams = { queryStringParameters: {} };

        const result = await handleGetMentorsList(eventWithoutQueryParams, {
            mentorService: mockMentorService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify(mentors),
        });

        expect(mockMentorService.queryMentorsWithFilters).toHaveBeenCalledWith({});
    });

    test("handleGetMentorsList should retrieve filtered mentors based on query parameters", async () => {
        mockMentorService.queryMentorsWithFilters.mockResolvedValueOnce([mentors[1]]);

        const eventWithQueryParams = { queryStringParameters: { skills: "Machine Learning" } };

        const result = await handleGetMentorsList(eventWithQueryParams, {
            mentorService: mockMentorService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify([mentors[1]]),
        });

        expect(mockMentorService.queryMentorsWithFilters).toHaveBeenCalledWith({
            skills: "Machine Learning",
        });
    });

    test("handleGetMentorsList should return 500 for unexpected errors", async () => {
        mockMentorService.queryMentorsWithFilters.mockRejectedValueOnce(new Error("Unexpected error"));

        const eventWithoutQueryParams = { queryStringParameters: {} };

        const result = await handleGetMentorsList(eventWithoutQueryParams, {
            mentorService: mockMentorService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockMentorService.queryMentorsWithFilters).toHaveBeenCalledWith({});
    });
});