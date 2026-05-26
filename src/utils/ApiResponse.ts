import { Response } from "express";

interface ApiResponseBody<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = "Success",
    statusCode = 200
  ): Response {
    const body: ApiResponseBody<T> = {
      success: true,
      data,
      message,
    };
    return res.status(statusCode).json(body);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500
  ): Response {
    const body: ApiResponseBody<null> = {
      success: false,
      message,
    };
    return res.status(statusCode).json(body);
  }
}
