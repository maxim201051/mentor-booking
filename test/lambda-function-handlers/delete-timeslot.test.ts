import { TimeSlotService } from "../../src/services/timeslot-service";
import { TimeSlotEntity } from "../../src/entities/timeslot-entity";
import { handleDeleteTimeslot } from "../../src/handlers/delete-timeslot";

describe("handleDeleteTimeslot Tests", () => {
    let mockTimeSlotService: jest.Mocked<TimeSlotService>;

    beforeEach(() => {
        mockTimeSlotService = {
            getTimeSlotById: jest.fn(),
            deleteTimeSlotById: jest.fn(),
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
        isBooked: true,
    };

    const eventWithValidData = {
        pathParameters: { mentorId: "mentor-1", timeslotId: "timeslot-1" },
    };


    test("handleDeleteTimeslot should delete timeslot successfully", async () => {
        (mockTimeSlotService.getTimeSlotById as jest.Mock).mockResolvedValueOnce(validTimeSlot);
        (mockTimeSlotService.deleteTimeSlotById as jest.Mock).mockResolvedValueOnce(undefined);

        const result = await handleDeleteTimeslot(eventWithValidData, { timeSlotService: mockTimeSlotService });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify({
                message: "Timeslot was successfully deleted",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.deleteTimeSlotById).toHaveBeenCalledWith("timeslot-1");
    });

    test("handleDeleteTimeslot should return error if 'mentorId' or 'timeslotId' is missing", async () => {
        const event = { pathParameters: { mentorId: "mentor-1" } }; 
        const result = await handleDeleteTimeslot(event, { timeSlotService: mockTimeSlotService });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "mentorId and timeslotId are required in the path parameters",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).not.toHaveBeenCalled();
        expect(mockTimeSlotService.deleteTimeSlotById).not.toHaveBeenCalled();
    });

    test("handleDeleteTimeslot should return error if timeslot does not exist", async () => {
        (mockTimeSlotService.getTimeSlotById as jest.Mock).mockResolvedValueOnce(null); 

        const result = await handleDeleteTimeslot(eventWithValidData, { timeSlotService: mockTimeSlotService });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Invalid timeslot",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.deleteTimeSlotById).not.toHaveBeenCalled();
    });

    test("handleDeleteTimeslot should return error if mentor does not own timeslot", async () => {
        const invalidMentorTimeslot = { ...validTimeSlot, mentorId: "mentor-2" }; 
        (mockTimeSlotService.getTimeSlotById as jest.Mock).mockResolvedValueOnce(invalidMentorTimeslot);

        const result = await handleDeleteTimeslot(eventWithValidData, { timeSlotService: mockTimeSlotService });

        expect(result).toEqual({
            statusCode: 403,
            body: JSON.stringify({
                error: "Access denied. Cannot delete timeslot owned by another mentor",
            }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.deleteTimeSlotById).not.toHaveBeenCalled();
    });

    test("handleDeleteTimeslot should return 500 for unexpected errors", async () => {
        (mockTimeSlotService.getTimeSlotById as jest.Mock).mockRejectedValueOnce(new Error("Unexpected error"));

        const result = await handleDeleteTimeslot(eventWithValidData, { timeSlotService: mockTimeSlotService });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockTimeSlotService.deleteTimeSlotById).not.toHaveBeenCalled();
    });
});