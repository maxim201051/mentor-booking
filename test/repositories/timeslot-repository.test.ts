import { TimeSlotRepository } from "../../src/repositories/timeslot-repository";

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

    test("getUpcomingTimeslotsByMentor should return time slots when they exist", async () => {
        const mentorId = "mentor-123";
        const timeSlotsResponse = {
        Items: [
            {
            id: { S: "timeslot-1" },
            mentorId: { S: mentorId },
            isBooked: { BOOL: false },
            startDate: { S: "2023-12-01T10:00:00Z" },
            endDate: { S: "2023-12-01T11:00:00Z" },
            },
            {
            id: { S: "timeslot-2" },
            mentorId: { S: mentorId },
            isBooked: { BOOL: false },
            startDate: { S: "2023-12-02T10:00:00Z" },
            endDate: { S: "2023-12-02T11:00:00Z" },
            },
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
                  ":currentDate": expect.any(Object), // Match dynamic date values
                },
              }),
            })
          );

        expect(result).toEqual([
        {
            id: "timeslot-1",
            mentorId: mentorId,
            isBooked: false,
            startDate: "2023-12-01T10:00:00Z",
            endDate: "2023-12-01T11:00:00Z",
        },
        {
            id: "timeslot-2",
            mentorId: mentorId,
            isBooked: false,
            startDate: "2023-12-02T10:00:00Z",
            endDate: "2023-12-02T11:00:00Z",
        },
        ]);
    });

    test("getUpcomingTimeslotsByMentor should return an empty array if no time slots exist", async () => {
        const mentorId = "mentor-456";

        mockDynamoDBClient.send.mockResolvedValueOnce({ Items: [] });

        const result = await timeSlotRepository.getUpcomingTimeslotsByMentor(mentorId);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: timeSlotsTableName,
            IndexName: "MentorTimeSlotsIndex",
            KeyConditionExpression: "mentorId = :mentorId",
            FilterExpression: "isBooked = :isBooked AND startDate > :currentDate",
            ExpressionAttributeValues: expect.objectContaining({
                ":mentorId": { S: mentorId },
                ":isBooked": { BOOL: false },
                ":currentDate": expect.any(Object), 
            }),
            },
        })
        );
        expect(result).toEqual([]);
    });

    test("getTimeSlotById should return a time slot if it exists", async () => {
        const timeslotId = "timeslot-123";
        const timeSlotResponse = {
        Item: {
            id: { S: timeslotId },
            mentorId: { S: "mentor-1" },
            isBooked: { BOOL: false },
            startDate: { S: "2023-12-01T10:00:00Z" },
            endDate: { S: "2023-12-01T11:00:00Z" },
        },
        };

        mockDynamoDBClient.send.mockResolvedValueOnce(timeSlotResponse);

        const result = await timeSlotRepository.getTimeSlotById(timeslotId);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: timeSlotsTableName,
            Key: { id: { S: timeslotId } },
            },
        })
        );

        expect(result).toEqual({
        id: "timeslot-123",
        mentorId: "mentor-1",
        isBooked: false,
        startDate: new Date("2023-12-01T10:00:00Z"),
        endDate: new Date("2023-12-01T11:00:00Z"),
        });
    });

    test("getTimeSlotById should return null if time slot does not exist", async () => {
        const timeslotId = "non-existent-timeslot";

        mockDynamoDBClient.send.mockResolvedValueOnce({});

        const result = await timeSlotRepository.getTimeSlotById(timeslotId);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: timeSlotsTableName,
            Key: { id: { S: timeslotId } },
            },
        })
        );

        expect(result).toBeNull();
    });

    test("updateTimeSlotIsBookedStatus should update the time slot booked status", async () => {
        const timeslotId = "timeslot-456";
        const isBooked = true;

        mockDynamoDBClient.send.mockResolvedValueOnce({});

        await timeSlotRepository.updateTimeSlotIsBookedStatus(timeslotId, isBooked);

        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
            input: {
            TableName: timeSlotsTableName,
            Key: { id: timeslotId },
            UpdateExpression: "set isBooked = :isBooked",
            ExpressionAttributeValues: {
                ":isBooked": true,
            },
            ReturnValues: "ALL_NEW",
            },
        })
        );
    });

    test("updateTimeSlotIsBookedStatus should throw an error if DynamoDB send fails", async () => {
        const timeslotId = "timeslot-123";
        const isBooked = false;
    
        mockDynamoDBClient.send.mockRejectedValueOnce(new Error("DynamoDB Failure"));
    
        await expect(
          timeSlotRepository.updateTimeSlotIsBookedStatus(timeslotId, isBooked)
        ).rejects.toThrow(`Could not update isBooked status of time slot ${timeslotId}`);
    
        expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              TableName: timeSlotsTableName,
              Key: { id: timeslotId },
              UpdateExpression: "set isBooked = :isBooked",
              ExpressionAttributeValues: {
                ":isBooked": isBooked,
              },
              ReturnValues: "ALL_NEW",
            }),
          })
        );
    });
});