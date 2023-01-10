import { S3Event } from "aws-lambda";
import { Textract } from "aws-sdk";
import { toInvoice } from "../helpers/invoice.helper";

export const handler = async (event: S3Event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const fileName = event.Records[0].s3.object.key;

  const params = {
    Document: {
      S3Object: {
        Bucket: bucketName,
        Name: fileName,
      },
    },
  };

  const textract = new Textract();
  const analyse = await textract.analyzeExpense(params).promise();
  const invoice = toInvoice(analyse);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileName, invoice }),
  };
};
