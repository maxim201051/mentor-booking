import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { TimeSlotService } from "../../lib/mentor-booking-service/services/timeslot-service";
import { TimeSlotEntity } from "../../lib/mentor-booking-service/entities/timeslot-entity";


jest.mock("@aws-sdk/client-dynamodb");

describe("TimeSlotService", () => {
    let timeSlotService: TimeSlotService;
    const mockDynamoDBClient = new DynamoDBClient({});
    const timeSlotsTableName = "TimeSlotsTable";

    beforeEach(() => {
        timeSlotService = new TimeSlotService(timeSlotsTableName, "eu-west-2");
        (mockDynamoDBClient.send as jest.Mock).mockClear();
    });

    test("getTimeslotsByMentor should return time slots", async () => {
        const mockResponse = {
        Items: [
            {
            id: { S: "timeslot-1" },
            mentorId: { S: "mentor-1" },
            startDate: { S: new Date("2023-10-01T10:00:00.000Z") },
            endDate: { S: new Date("2023-10-01T11:00:00.000Z") },
            isBooked: { BOOL: false },
            },
        ],
        };
        (mockDynamoDBClient.send as jest.Mock).mockResolvedValue(mockResponse);

        const timeSlots = await timeSlotService.getTimeslotsByMentor("mentor-1");
        expect(timeSlots).toEqual([
        {
            id: "timeslot-1",
            mentorId: "mentor-1",
            startDate: new Date("2023-10-01T10:00:00.000Z"),
            endDate: new Date("2023-10-01T11:00:00.000Z"),
            isBooked: false,
        } as TimeSlotEntity,
        ]);
    });

    test("getTimeslotsByMentor should handle empty response", async () => {
        const mockResponse = { Items: [] };
        (mockDynamoDBClient.send as jest.Mock).mockResolvedValue(mockResponse);

        const timeSlots = await timeSlotService.getTimeslotsByMentor("mentor-1");
        expect(timeSlots).toEqual([]);
    });

    test("getTimeslotsByMentor should handle DynamoDB error", async () => {
        (mockDynamoDBClient.send as jest.Mock).mockRejectedValue(new Error("DynamoDB error"));

        await expect(timeSlotService.getTimeslotsByMentor("mentor-1")).rejects.toThrow(
        "Could not fetch time slots for mentor with ID mentor-1"
        );
    });
});