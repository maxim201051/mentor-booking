import { TimeSlotEntity } from "../../src/entities/timeslot-entity";
import { handleUpdateTimeslot } from "../../src/handlers/update-timeslot";
import { TimeSlotService } from "../../src/services/timeslot-service";

describe("handleUpdateTimeslot Tests", () => {
    let mockTimeSlotService: jest.Mocked<TimeSlotService>;

    beforeEach(() => {
        mockTimeSlotService = {
            getTimeSlotById: jest.fn(), 
            getOverlappingTimeSlotsByMentor: jest.fn(), 
            updateTimeslot: jest.fn(), 
        } as unknown as jest.Mocked<TimeSlotService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const validTimeSlot: TimeSlotEntity = {
        id: "timeslot-1",
        mentorId: "mentor-1",
        startDate: new Date("2025-12-01T10:00:00Z"),
        endDate: new Date("2025-12-01T11:00:00Z"),
        isBooked: false,
    };

    const overlappingTimeSlot: TimeSlotEntity = {
        id: "timeslot-2",
        mentorId: "mentor-1",
        startDate: new Date("2025-12-01T09:30:00Z"),
        endDate: new Date("2025-12-01T10:30:00Z"),
        isBooked: false,
    };

    const eventWithValidMentorIdAndTimeslotId = {
        pathParameters: {
            mentorId: "mentor-1",
            timeslotId: "timeslot-1",
        },
        body: JSON.stringify({
            startDate: "2025-12-02T10:00:00Z",
            endDate: "2025-12-02T11:00:00Z",
        }),
    };

    test("handleUpdateTimeslot should successfully update a timeslot", async () => {
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(validTimeSlot);
        mockTimeSlotService.getOverlappingTimeSlotsByMentor.mockResolvedValueOnce([]); 
        mockTimeSlotService.updateTimeslot.mockResolvedValueOnce({
            ...validTimeSlot,
            startDate: new Date("2025-12-02T10:00:00Z"),
            endDate: new Date("2025-12-02T11:00:00Z"),
        }); 

        const result = await handleUpdateTimeslot(eventWithValidMentorIdAndTimeslotId, {
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify({
                message: "Timeslot was successfully updated",
                timeslot: JSON.stringify({
                    ...validTimeSlot,
                    startDate: new Date("2025-12-02T10:00:00Z"),
                    endDate: new Date("2025-12-02T11:00:00Z"),
                }),
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.getOverlappingTimeSlotsByMentor).toHaveBeenCalledWith(
            "mentor-1",
            new Date("2025-12-02T10:00:00Z"),
            new Date("2025-12-02T11:00:00Z")
        );
        expect(mockTimeSlotService.updateTimeslot).toHaveBeenCalledWith({
            id: "timeslot-1",
            mentorId: "mentor-1",
            startDate: new Date("2025-12-02T10:00:00Z"),
            endDate: new Date("2025-12-02T11:00:00Z"),
            isBooked: false,
        });
    });

    test("handleUpdateTimeslot should return error if 'mentorId' or 'timeslotId' is missing", async () => {
        const event = { ...eventWithValidMentorIdAndTimeslotId, pathParameters: null }; 

        const result = await handleUpdateTimeslot(event, {
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "mentorId and timeslotId are required in the path parameters",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).not.toHaveBeenCalled();
        expect(mockTimeSlotService.updateTimeslot).not.toHaveBeenCalled();
    });

    test("handleUpdateTimeslot should return error if timeslot does not exist", async () => {
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(null); 
        const result = await handleUpdateTimeslot(eventWithValidMentorIdAndTimeslotId, {
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Invalid timeslot",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.updateTimeslot).not.toHaveBeenCalled();
    });

    test("handleUpdateTimeslot should return error if mentor does not own the timeslot", async () => {
        const invalidTimeSlot = { ...validTimeSlot, mentorId: "mentor-2" }; 
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(invalidTimeSlot);

        const result = await handleUpdateTimeslot(eventWithValidMentorIdAndTimeslotId, {
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 403,
            body: JSON.stringify({
                error: "Access denied. Cannot update timeslot owned by another mentor",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.updateTimeslot).not.toHaveBeenCalled();
    });

    test("handleUpdateTimeslot should return error for timeslot with start date in the past", async () => {
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(validTimeSlot);

        const eventWithPastDates = {
            ...eventWithValidMentorIdAndTimeslotId,
            body: JSON.stringify({
                startDate: new Date("2023-01-01T10:00:00Z").toISOString(), 
                endDate: new Date("2025-12-02T11:00:00Z").toISOString(),
            }),
        };

        const result = await handleUpdateTimeslot(eventWithPastDates, {
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Timeslot should be in the future",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.updateTimeslot).not.toHaveBeenCalled();
    });

    test("handleUpdateTimeslot should return error for overlapping timeslot", async () => {
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(validTimeSlot);
        mockTimeSlotService.getOverlappingTimeSlotsByMentor.mockResolvedValueOnce([overlappingTimeSlot]); 

        const result = await handleUpdateTimeslot(eventWithValidMentorIdAndTimeslotId, {
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Timeslot should not overlap exesting mentors timeslots",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.getOverlappingTimeSlotsByMentor).toHaveBeenCalledWith(
            "mentor-1",
            new Date("2025-12-02T10:00:00Z"),
            new Date("2025-12-02T11:00:00Z")
        );
    });

    test("handleUpdateTimeslot should return 500 for unexpected errors", async () => {
        mockTimeSlotService.getTimeSlotById.mockRejectedValueOnce(new Error("Unexpected error"));

        const result = await handleUpdateTimeslot(eventWithValidMentorIdAndTimeslotId, {
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
    });
});