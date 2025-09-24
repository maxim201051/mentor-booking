import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import Handlebars from "handlebars";
import { EmailNotificationService } from "../../src/services/email-notification-service";
import {
    bookingCancelledMentorEmailTemplate,
    bookingCancelledStudentEmailTemplate,
    bookingCreatedMentorEmailTemplate,
    bookingCreatedStudentEmailTemplate,
} from "../../src/email/email-templates-container";

jest.mock("@aws-sdk/client-ses", () => {
    const actual = jest.requireActual("@aws-sdk/client-ses");
    return {
        ...actual,
        SESClient: jest.fn(() => ({
            send: jest.fn(),
        })),
        SendEmailCommand: actual.SendEmailCommand,
    };
});

jest.mock("handlebars", () => ({
    compile: jest.fn(),
}));

describe("EmailNotificationService Tests", () => {
    let mockSesClient: jest.Mocked<SESClient>;
    let emailNotificationService: EmailNotificationService;

    beforeEach(() => {
        mockSesClient = new SESClient({}) as jest.Mocked<SESClient>;
        emailNotificationService = new EmailNotificationService(mockSesClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const bookingNotification = {
        type: "booking.created",
        bookingId: "booking-1",
        studentFullName: "John Doe",
        studentEmail: "john.doe@example.com",
        mentorFullName: "Jane Smith",
        mentorEmail: "jane.smith@example.com",
        startDate: new Date("2023-12-01T10:00:00Z"),
        endDate: new Date("2023-12-01T11:00:00Z"),
    };

    test("notifyAboutBooking should send correct emails for 'booking.created'", async () => {
        const studentEmailBody = "Student email body content";
        const mentorEmailBody = "Mentor email body content";

        (Handlebars.compile as jest.Mock)
            .mockReturnValueOnce(() => studentEmailBody) 
            .mockReturnValueOnce(() => mentorEmailBody);

        await emailNotificationService.notifyAboutBooking(bookingNotification);

        expect(Handlebars.compile).toHaveBeenCalledWith(bookingCreatedStudentEmailTemplate);
        expect(Handlebars.compile).toHaveBeenCalledWith(bookingCreatedMentorEmailTemplate);

        expect(mockSesClient.send).toHaveBeenCalledWith(
            expect.any(SendEmailCommand)
        );

        expect(mockSesClient.send).toHaveBeenCalledTimes(2);

        expect(mockSesClient.send).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                input: {
                    Destination: {
                        ToAddresses: ["john.doe@example.com"],
                    },
                    Message: {
                        Subject: { Data: "Booking Confirmation" },
                        Body: { Text: { Data: studentEmailBody } },
                    },
                    Source: "noreply@yourdomain.com",
                },
            }),
        );

        expect(mockSesClient.send).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                input: {
                    Destination: {
                        ToAddresses: ["jane.smith@example.com"],
                    },
                    Message: {
                        Subject: { Data: "Booking Confirmation" },
                        Body: { Text: { Data: mentorEmailBody } },
                    },
                    Source: "noreply@yourdomain.com",
                },
            }),
        );
    });

    test("notifyAboutBooking should send correct emails for 'booking.cancelled'", async () => {
        const bookingCancelledNotification = {
            ...bookingNotification,
            type: "booking.cancelled",
        };

        const studentEmailBody = "Student cancellation email body content";
        const mentorEmailBody = "Mentor cancellation email body content";

        (Handlebars.compile as jest.Mock)
            .mockReturnValueOnce(() => studentEmailBody) 
            .mockReturnValueOnce(() => mentorEmailBody); 

        await emailNotificationService.notifyAboutBooking(bookingCancelledNotification);

        expect(Handlebars.compile).toHaveBeenCalledWith(bookingCancelledStudentEmailTemplate);
        expect(Handlebars.compile).toHaveBeenCalledWith(bookingCancelledMentorEmailTemplate);

        expect(mockSesClient.send).toHaveBeenCalledWith(
            expect.any(SendEmailCommand)
        );

        expect(mockSesClient.send).toHaveBeenCalledTimes(2);

        expect(mockSesClient.send).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                input: {
                    Destination: {
                        ToAddresses: ["john.doe@example.com"],
                    },
                    Message: {
                        Subject: { Data: "Booking Cancellation" },
                        Body: { Text: { Data: studentEmailBody } },
                    },
                    Source: "noreply@yourdomain.com",
                },
            }),
        );

        expect(mockSesClient.send).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                input: {
                    Destination: {
                        ToAddresses: ["jane.smith@example.com"],
                    },
                    Message: {
                        Subject: { Data: "Booking Cancellation" },
                        Body: { Text: { Data: mentorEmailBody } },
                    },
                    Source: "noreply@yourdomain.com",
                },
            }),
        );
    });
});