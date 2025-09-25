import { handleNotifyAboutBooking } from "../../src/handlers/notify-about-booking";
import { EmailNotificationService } from "../../src/services/email-notification-service";

describe("handleNotifyAboutBooking Tests", () => {
    let mockEmailNotificationService: jest.Mocked<EmailNotificationService>;

    beforeEach(() => {
        mockEmailNotificationService = {
            notifyAboutBooking: jest.fn(), 
        } as unknown as jest.Mocked<EmailNotificationService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const eventWithBookingCreated = {
        Records: [
            {
                body: JSON.stringify({
                    type: "booking.created",
                    bookingId: "booking-1",
                    studentFullName: "John Doe",
                    studentEmail: "john.doe@example.com",
                    mentorFullName: "Jane Smith",
                    mentorEmail: "jane.smith@example.com",
                    startDate: "2023-12-01T10:00:00Z",
                    endDate: "2023-12-01T11:00:00Z",
                }),
            },
        ],
    };

    const eventWithBookingCancelled = {
        Records: [
            {
                body: JSON.stringify({
                    type: "booking.cancelled",
                    bookingId: "booking-2",
                    studentFullName: "John Doe",
                    studentEmail: "john.doe@example.com",
                    mentorFullName: "Jane Smith",
                    mentorEmail: "jane.smith@example.com",
                    startDate: "2023-12-01T10:00:00Z",
                    endDate: "2023-12-01T11:00:00Z",
                }),
            },
        ],
    };

    const eventWithUnexpectedType = {
        Records: [
            {
                body: JSON.stringify({
                    type: "unexpected.type",
                    bookingId: "booking-2",
                    studentFullName: "John Doe",
                    studentEmail: "john.doe@example.com",
                    mentorFullName: "Jane Smith",
                    mentorEmail: "jane.smith@example.com",
                    startDate: "2023-12-01T10:00:00Z",
                    endDate: "2023-12-01T11:00:00Z",
                }),
            },
        ],
    };

    test("handleNotifyAboutBooking should process booking.created and send notification successfully", async () => {
        mockEmailNotificationService.notifyAboutBooking.mockResolvedValueOnce();

        const result = await handleNotifyAboutBooking(eventWithBookingCreated, {
            emailNotificationService: mockEmailNotificationService,
        });

        expect(result).toEqual({ message: "Notifications processed" });

        expect(mockEmailNotificationService.notifyAboutBooking).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "booking.created",
                bookingId: "booking-1",
                studentFullName: "John Doe",
                mentorFullName: "Jane Smith",
            })
        );
    });

    test("handleNotifyAboutBooking should process booking.cancelled and send notification successfully", async () => {
        mockEmailNotificationService.notifyAboutBooking.mockResolvedValueOnce();

        const result = await handleNotifyAboutBooking(eventWithBookingCancelled, {
            emailNotificationService: mockEmailNotificationService,
        });

        expect(result).toEqual({ message: "Notifications processed" });

        expect(mockEmailNotificationService.notifyAboutBooking).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "booking.cancelled",
                bookingId: "booking-2",
                studentFullName: "John Doe",
                mentorFullName: "Jane Smith",
            })
        );
    });

    test("handleNotifyAboutBooking should skip processing for unexpected event types", async () => {
        const result = await handleNotifyAboutBooking(eventWithUnexpectedType, {
            emailNotificationService: mockEmailNotificationService,
        });

        expect(result).toEqual({ message: "Unexpected event type" });

        expect(mockEmailNotificationService.notifyAboutBooking).not.toHaveBeenCalled();
    });

    test("handleNotifyAboutBooking should throw an error for invalid booking notification structure", async () => {
        const invalidEvent = {
            Records: [
                {
                    body: JSON.stringify({
                        invalidField: "invalidValue",
                    }),
                },
            ],
        };

        await expect(
            handleNotifyAboutBooking(invalidEvent, {
                emailNotificationService: mockEmailNotificationService,
            })
        ).rejects.toThrow(
            expect.objectContaining({ name: "ZodError" }) 
        );

        expect(mockEmailNotificationService.notifyAboutBooking).not.toHaveBeenCalled();
    });

    test("handleNotifyAboutBooking should throw an error if email notification fails", async () => {
        const event = { ...eventWithBookingCreated };
        const simulatedError = new Error("Email sending failed");

        mockEmailNotificationService.notifyAboutBooking.mockRejectedValueOnce(simulatedError);

        await expect(
            handleNotifyAboutBooking(event, {
                emailNotificationService: mockEmailNotificationService,
            })
        ).rejects.toThrow(simulatedError);

        expect(mockEmailNotificationService.notifyAboutBooking).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "booking.created",
                bookingId: "booking-1",
            })
        );
    });
});