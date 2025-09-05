import { DynamoDBClient, ScanCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { MentorService } from "../../lib/mentor-booking-service/services/mentor-service";
import { MentorEntity } from "../../lib/mentor-booking-service/entities/mentor-entity";


jest.mock("@aws-sdk/client-dynamodb");

describe("MentorService", () => {
    let mentorService: MentorService;
    const mockDynamoDBClient = new DynamoDBClient({});
    const mentorsTableName = "MentorsTable";

    beforeEach(() => {
        mentorService = new MentorService(mentorsTableName, "eu-west-2");
        (mockDynamoDBClient.send as jest.Mock).mockClear();
    });

    test("getAllMentors should return mentors", async () => {
        const mockResponse = {
        Items: [
            {
            id: { S: "mentor-1" },
            name: { S: "John Doe" },
            email: { S: "john.doe@example.com" },
            skills: { S: ["JavaScript", "AWS"] },
            experience: { N: "5" },
            },
        ],
        };
        (mockDynamoDBClient.send as jest.Mock).mockResolvedValue(mockResponse);

        const mentors = await mentorService.getAllMentors();
        expect(mentors).toEqual([
        {
            id: "mentor-1",
            name: "John Doe",
            email: "john.doe@example.com",
            skills: ["JavaScript", "AWS"],
            experience: 5,
        } as MentorEntity,
        ]);
    });

    test("getAllMentors should handle DynamoDB error", async () => {
        (mockDynamoDBClient.send as jest.Mock).mockRejectedValue(new Error("DynamoDB error"));

        await expect(mentorService.getAllMentors()).rejects.toThrow(
        "Could not fetch mentors"
        );
    });

    test("getAllMentors should handle empty response", async () => {
        const mockResponse = { Items: [] };
        (mockDynamoDBClient.send as jest.Mock).mockResolvedValue(mockResponse);

        const mentors = await mentorService.getAllMentors();
        expect(mentors).toEqual([]);
    });

    test("isMentorExist should return true if mentor exists", async () => {
        const mockResponse = { Item: { id: { S: "mentor-1" } } };
        (mockDynamoDBClient.send as jest.Mock).mockResolvedValue(mockResponse);

        const exists = await mentorService.isMentorExist("mentor-1");
        expect(exists).toBe(true);
    });

    test("isMentorExist should return false if mentor does not exist", async () => {
        const mockResponse = { Item: null };
        (mockDynamoDBClient.send as jest.Mock).mockResolvedValue(mockResponse);

        const exists = await mentorService.isMentorExist("mentor-1");
        expect(exists).toBe(false);
    });
});