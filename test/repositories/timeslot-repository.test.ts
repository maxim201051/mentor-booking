import { TimeSlotRepository } from "../../src/repositories/timeslot-repository";
import { marshall } from "@aws-sdk/util-dynamodb";

jest.mock("@aws-sdk/client-dynamodb", () => {
    const actual = jest.requireActual("@aws-sdk/client-dynamodb");
    return {
        ...actual,
        DynamoDBClient: jest.fn(() => ({
            send: jest.fn(),
        })),
        GetItemCommand: actual.GetItemCommand,
        QueryCommand: actual.QueryCommand,
        UpdateCommand: actual.UpdateCommand,
        DeleteCommand: actual.DeleteCommand,
        PutItemCommand: actual.PutItemCommand,
    };
});

describe("TimeSlotRepository Tests", () => {
    const timeSlotsTableName = "TimeSlotsTable";
    let mockDynamoDBClient: any;
    let timeSlotRepository: TimeSlotRepository;

    beforeEach(() => {
        mockDynamoDBClient = {
            send: jest.fn(),
        };
        timeSlotRepository = new TimeSlotRepository(timeSlotsTableName, mockDynamoDBClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const timeslot1 = {
        id: "timeslot-1",
        mentorId: "mentor-1",
        isBooked: false,
        startDate: new Date("2023-12-01T10:00:00Z"),
        endDate: new Date("2023-12-01T11:00:00Z"),
    };

    const timeslot2 = {
        id: "timeslot-2",
        mentorId: "mentor-1",
        isBooked: true,
        startDate: new Date("2023-12-02T10:00:00Z"),
        endDate: new Date("2023-12-02T11:00:00Z"),
    };

    test("getUpcomingTimeslotsByMentor should return time slots when they exist", async () => {
        const mentorId = "mentor-1";

        const timeSlotsResponse = {
            Items: [
                marshall({
                    ...timeslot1,
                    startDate: timeslot1.startDate.toISOString(),
                    endDate: timeslot1.endDate.toISOString(),
                }),
                marshall({
                    ...timeslot2,
                    startDate: timeslot2.startDate.toISOString(),
                    endDate: timeslot2.endDate.toISOString(),
                }),
            ],
        };

        mockDynamoDBClient.send.mockResolvedValueOnce(timeSlotsResponse);

        const result = await timeSlotRepository.getUpcomingTimeslotsByMentor(mentorId);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: expect.objectContaining({
                    TableName: timeSlotsTableName,
                    IndexName: "MentorTimeSlotsIndex",
                    KeyConditionExpression: "mentorId = :mentorId",
                    FilterExpression: "isBooked = :isBooked AND startDate > :currentDate",
                    ExpressionAttributeValues: {
                        ":mentorId": { S: mentorId },
                        ":isBooked": { BOOL: false },
                        ":currentDate": { S: expect.any(String) },
                    },
                }),
            })
        );

        expect(result).toEqual([{
            ...timeslot1,
            startDate: timeslot1.startDate.toISOString(),
            endDate: timeslot1.endDate.toISOString(),
        }, 
        {
            ...timeslot2,
            startDate: timeslot2.startDate.toISOString(),
            endDate: timeslot2.endDate.toISOString(),
        }]);
    });

    test("getUpcomingTimeslotsByMentor should return an empty array if no time slots exist", async () => {
        const mentorId = "mentor-2";

        mockDynamoDBClient.send.mockResolvedValueOnce({ Items: [] });

        const result = await timeSlotRepository.getUpcomingTimeslotsByMentor(mentorId);

        expect(result).toEqual([]);
    });

    test("getUpcomingTimeslotsByMentor should throw an error if DynamoDB fails", async () => {
        const mentorId = "mentor-123";
        const errorMessage = "DynamoDB Error";

        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(
            timeSlotRepository.getUpcomingTimeslotsByMentor(mentorId)
        ).rejects.toThrow(`Could not fetch upcoming time slots for mentor with ID ${mentorId}`);
    });


    test("getTimeSlotById should return a time slot if it exists", async () => {
        const timeslotResponse = { Item: marshall({
            ...timeslot1,
            startDate: timeslot1.startDate.toISOString(),
            endDate: timeslot1.endDate.toISOString(),
        })};

        mockDynamoDBClient.send.mockResolvedValueOnce(timeslotResponse);

        const result = await timeSlotRepository.getTimeSlotById(timeslot1.id);

        expect(result).toEqual(timeslot1);
    });

    test("getTimeSlotById should return null if the time slot does not exist", async () => {
        mockDynamoDBClient.send.mockResolvedValueOnce({});

        const result = await timeSlotRepository.getTimeSlotById("non-existent-id");

        expect(result).toBeNull();
    });

    test("getTimeSlotById should throw an error if DynamoDB fails", async () => {
        const errorMessage = "DynamoDB Failure";

        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(
            timeSlotRepository.getTimeSlotById("timeslot-1")
        ).rejects.toThrow("Could not fetch time slot for ID timeslot-1");
    });


    test("createTimeslot should successfully invoke PutItemCommand", async () => {
        mockDynamoDBClient.send.mockResolvedValueOnce({});

        await timeSlotRepository.createTimeslot(timeslot1);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TableName: timeSlotsTableName,
                    Item: expect.any(Object),
                },
            })
        );
    });

    test("createTimeslot should throw an error if DynamoDB fails", async () => {
        const errorMessage = "DynamoDB Failure";

        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(
            timeSlotRepository.createTimeslot(timeslot1)
        ).rejects.toThrow("Failed to create timeslot");
    });

    test("updateTimeSlot should successfully update a time slot", async () => {
        mockDynamoDBClient.send.mockResolvedValueOnce({});

        await timeSlotRepository.updateTimeSlot(timeslot1);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: expect.objectContaining({
                    TableName: timeSlotsTableName,
                    Key: { id: timeslot1.id },
                    UpdateExpression: expect.any(String),
                    ExpressionAttributeValues: expect.objectContaining({
                        ":mentorId": timeslot1.mentorId,
                        ":startDate": timeslot1.startDate.toISOString(),
                        ":endDate": timeslot1.endDate.toISOString(),
                    }),
                }),
            })
        );
    });

    test("updateTimeSlot should throw an error if DynamoDB fails", async () => {
        const errorMessage = "DynamoDB Failure";

        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(timeSlotRepository.updateTimeSlot(timeslot1)).rejects.toThrow(
            `Could not update isBooked status of time slot ${timeslot1.id}`
        );
    });

    test("deleteTimeslotById should successfully delete a time slot", async () => {
        mockDynamoDBClient.send.mockResolvedValueOnce({});

        await timeSlotRepository.deleteTimeslotById(timeslot1.id);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    TableName: timeSlotsTableName,
                    Key: { id: timeslot1.id },
                },
            })
        );
    });

    test("deleteTimeslotById should throw an error if DynamoDB fails", async () => {
        const errorMessage = "DynamoDB Error";

        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(
            timeSlotRepository.deleteTimeslotById(timeslot1.id)
        ).rejects.toThrow(`Failed to delete timeslot by ID ${timeslot1.id}`);
    });

    test("getOverlappingTimeSlotsByMentor should return overlapping time slots", async () => {
        const mentorId = "mentor-1";
        const startDate = new Date("2023-12-01T09:00:00Z");
        const endDate = new Date("2023-12-01T12:00:00Z");

        mockDynamoDBClient.send.mockResolvedValueOnce({
            Items: [marshall({
                ...timeslot1,
                startDate: timeslot1.startDate.toISOString(),
                endDate: timeslot1.endDate.toISOString(),
            })],
        });

        const result = await timeSlotRepository.getOverlappingTimeSlotsByMentor(
            mentorId,
            startDate,
            endDate
        );

        expect(result).toEqual([{
            ...timeslot1,
            startDate: timeslot1.startDate.toISOString(),
            endDate: timeslot1.endDate.toISOString(),
        }]);
    });

    test("getOverlappingTimeSlotsByMentor should return an empty array if no overlapping time slots exist", async () => {
        const mentorId = "mentor-1";
        const startDate = new Date("2023-12-10T10:00:00Z");
        const endDate = new Date("2023-12-10T11:00:00Z");

        mockDynamoDBClient.send.mockResolvedValueOnce({ Items: [] });

        const result = await timeSlotRepository.getOverlappingTimeSlotsByMentor(
            mentorId,
            startDate,
            endDate
        );

        expect(result).toEqual([]);
    });

    test("getOverlappingTimeSlotsByMentor should throw an error if DynamoDB fails", async () => {
        const errorMessage = "DynamoDB Error";

        mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

        await expect(
            timeSlotRepository.getOverlappingTimeSlotsByMentor("mentor-1", new Date(), new Date())
        ).rejects.toThrow("Could not fetch overlapping time slots for mentor with ID mentor-1");
    });
});