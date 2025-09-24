import { MentorRepository } from "../../src/repositories/mentor-repository";
import { dynamodbUtils } from "../../src/utils/dynamodb-utils";
import { marshall } from "@aws-sdk/util-dynamodb";

jest.mock("@aws-sdk/client-dynamodb", () => {
    const actual = jest.requireActual("@aws-sdk/client-dynamodb");
    return {
        ...actual,
        DynamoDBClient: jest.fn(() => ({
            send: jest.fn(),
        })),
        GetItemCommand: actual.GetItemCommand,
        ScanCommand: actual.ScanCommand,
        PutItemCommand: actual.PutItemCommand,
    };
});

jest.mock("../../src/utils/dynamodb-utils", () => ({
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

    const mentor1 = {
        id: "44bf38a9-88bd-4f2d-8b5f-decd14a8c0cc",
        fullName: "John Doe",
        email: "john.doe@example.com",
        skills: ["JavaScript", "AWS", "React"],
        experience: 5,
    };

    const mentor2 = {
        id: "a3b0c0e8-537e-4c5b-8025-06d8f6d7f20f",
        fullName: "Jane Smith",
        email: "jane.smith@example.com",
        skills: ["Python", "Machine Learning", "Django"],
        experience: 8,
    };

    test("getMentorById should return a mentor when the mentor exists", async () => {
        const mentorResponse = {
            Item: marshall(mentor1),
        };

        mockDynamoDBClient.send.mockResolvedValueOnce(mentorResponse);

        const result = await mentorRepository.getMentorById(mentor1.id);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TableName: mentorsTableName,
                    Key: { id: { S: mentor1.id } },
                },
            })
        );

        expect(result).toEqual(mentor1);
    });

    test("getMentorById should return null when the mentor does not exist", async () => {
        mockDynamoDBClient.send.mockResolvedValueOnce({});

        const result = await mentorRepository.getMentorById("non-existent-id");

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TableName: mentorsTableName,
                    Key: { id: { S: "non-existent-id" } },
                },
            })
        );

        expect(result).toBeNull();
    });

    test("getMentorById should throw an error if the GetItemCommand fails", async () => {
        const errorMessage = "DynamoDB Error";
        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(mentorRepository.getMentorById(mentor1.id)).rejects.toThrow(
            `Failed to get mentor by ID ${mentor1.id}`
        );

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TableName: mentorsTableName,
                    Key: { id: { S: mentor1.id } },
                },
            })
        );
    });

    test("queryMentorsWithFilters should return mentors with filters applied", async () => {
        const queryParams = { skills: "JavaScript" };

        const searchParams = {
            FilterExpression: "contains(skills, :skills)",
            ExpressionAttributeValues: {
                ":skills": { S: queryParams.skills },
            },
        };

        (dynamodbUtils.createMentorSearchParams as jest.Mock).mockReturnValue(searchParams);

        const mentorsResponse = {
            Items: [marshall(mentor1), marshall(mentor2)],
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

        expect(result).toEqual([mentor1, mentor2]);
    });

    test("queryMentorsWithFilters should return an empty array if no mentors match", async () => {
        const queryParams = { skills: "Non-Existent Skill" };

        const searchParams = {
            FilterExpression: "contains(skills, :skills)",
            ExpressionAttributeValues: {
                ":skills": { S: queryParams.skills },
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
        const queryParams = { skills: "JavaScript" };

        (dynamodbUtils.createMentorSearchParams as jest.Mock).mockReturnValue({});

        const errorMessage = "DynamoDB Error";
        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(
            mentorRepository.queryMentorsWithFilters(queryParams)
        ).rejects.toThrow("Could not fetch mentors");

        expect(mockDynamoDBClient.send).toHaveBeenCalled();
    });

    test("createMentor should successfully invoke PutItemCommand", async () => {
        mockDynamoDBClient.send.mockResolvedValueOnce({});

        await mentorRepository.createMentor(mentor1);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TableName: mentorsTableName,
                    Item: marshall(mentor1),
                },
            })
        );
    });

    test("createMentor should throw an error if the PutItemCommand fails", async () => {
        const errorMessage = "DynamoDB Error";
        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(mentorRepository.createMentor(mentor1)).rejects.toThrow("Failed to create mentor");

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TableName: mentorsTableName,
                    Item: marshall(mentor1),
                },
            })
        );
    });
});