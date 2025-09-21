import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class SharedResourcesStack extends Stack {
    public readonly deadLetterQueue: Queue;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
    
        this.deadLetterQueue = new Queue(this, "DeadLetterQueue", {
            queueName: "DeadLetterQueue",
            retentionPeriod: Duration.days(4),
        });
    }
}