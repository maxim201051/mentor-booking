import { MentorRepository } from "../../lib/mentor-booking-service/repositories/mentor-repository";
import { dynamodbUtils } from "../../lib/mentor-booking-service/utils/dynamodb-utils";

jest.mock("@aws-sdk/client-dynamodb", () => {
    const actual = jest.requireActual("@aws-sdk/client-dynamodb");
    return {
        ...actual,
        DynamoDBClient: jest.fn(() => ({
        send: jest.fn(),
        })),
        GetItemCommand: actual.GetItemCommand,
        ScanCommand: actual.ScanCommand,
    };
});

jest.mock("../../lib/mentor-booking-service/utils/dynamodb-utils", () => ({
    dynamodbUtils: {
        createMentorSearchParams: jest.fn(),
    },
}));

describe("MentorRepository Tests", () => {
    const mentorsTableName = "MentorsTable";
    let mockDynamoDBClient: any; 
    let mentorRepository: MentorRepository;

    beforeEach(() => {
        mockDynamoDBClient = {
        send: jest.fn(),
        };

        mentorRepository = new MentorRepository(mentorsTableName, mockDynamoDBClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("getMentorById should return a mentor when the mentor exists", async () => {
        const mentorId = "mentor-123";

        const mentorResponse = {
        Item: {
            id: { S: mentorId },
            firstName: { S: "John" },
            lastName: { S: "Doe" },
            expertise: { S: "Software Development" },
        },
        };

        mockDynamoDBClient.send.mockResolvedValueOnce(mentorResponse);

        const result = await mentorRepository.getMentorById(mentorId);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: mentorsTableName,
            Key: { id: { S: mentorId } },
            },
        })
        );

        expect(result).toEqual({
        id: mentorId,
        firstName: "John",
        lastName: "Doe",
        expertise: "Software Development",
        });
    });

    test("getMentorById should return null when the mentor does not exist", async () => {
        const mentorId = "non-existent-mentor";

        mockDynamoDBClient.send.mockResolvedValueOnce({}); 

        const result = await mentorRepository.getMentorById(mentorId);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: mentorsTableName,
            Key: { id: { S: mentorId } },
            },
        })
        );

        expect(result).toBeNull();
    });

    test("queryMentorsWithFilters should return mentors with filters applied", async () => {
        const queryParams = { expertise: "Software Development" };

        const searchParams = {
        FilterExpression: "expertise = :expertise",
        ExpressionAttributeValues: {
            ":expertise": { S: queryParams.expertise },
        },
        };
        (dynamodbUtils.createMentorSearchParams as jest.Mock).mockReturnValue(searchParams);

        const mentorsResponse = {
        Items: [
            {
            id: { S: "mentor-1" },
            firstName: { S: "John" },
            lastName: { S: "Doe" },
            expertise: { S: queryParams.expertise },
            },
            {
            id: { S: "mentor-2" },
            firstName: { S: "Jane" },
            lastName: { S: "Smith" },
            expertise: { S: queryParams.expertise },
            },
        ],
        };

        mockDynamoDBClient.send.mockResolvedValueOnce(mentorsResponse);

        const result = await mentorRepository.queryMentorsWithFilters(queryParams);

        expect(dynamodbUtils.createMentorSearchParams).toHaveBeenCalledWith(
        new Map(Object.entries(queryParams))
        );

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: mentorsTableName,
            FilterExpression: searchParams.FilterExpression,
            ExpressionAttributeValues: searchParams.ExpressionAttributeValues,
            },
        })
        );

        expect(result).toEqual([
        {
            id: "mentor-1",
            firstName: "John",
            lastName: "Doe",
            expertise: "Software Development",
        },
        {
            id: "mentor-2",
            firstName: "Jane",
            lastName: "Smith",
            expertise: "Software Development",
        },
        ]);
    });

    test("queryMentorsWithFilters should return an empty array if no mentors match", async () => {
        const queryParams = { expertise: "Non-Existent Expertise" };

        const searchParams = {
        FilterExpression: "expertise = :expertise",
        ExpressionAttributeValues: {
            ":expertise": { S: queryParams.expertise },
        },
        };
        (dynamodbUtils.createMentorSearchParams as jest.Mock).mockReturnValue(searchParams);

        mockDynamoDBClient.send.mockResolvedValueOnce({ Items: [] });

        const result = await mentorRepository.queryMentorsWithFilters(queryParams);

        expect(dynamodbUtils.createMentorSearchParams).toHaveBeenCalledWith(
        new Map(Object.entries(queryParams))
        );

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: mentorsTableName,
            FilterExpression: searchParams.FilterExpression,
            ExpressionAttributeValues: searchParams.ExpressionAttributeValues,
            },
        })
        );

        expect(result).toEqual([]);
    });

    test("queryMentorsWithFilters should throw an error if there is an exception", async () => {
        const queryParams = { expertise: "Software Development" };

        (dynamodbUtils.createMentorSearchParams as jest.Mock).mockReturnValue({});

        const errorMessage = "DynamoDB Error";
        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(
        mentorRepository.queryMentorsWithFilters(queryParams)
        ).rejects.toThrow("Could not fetch mentors");

        expect(mockDynamoDBClient.send).toHaveBeenCalled();
    });
});