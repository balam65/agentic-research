class AppError(Exception):
    def __init__(self, detail: str, error_code: str, status_code: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.error_code = error_code
        self.status_code = status_code


class BadRequestError(AppError):
    def __init__(self, detail: str, error_code: str = "bad_request") -> None:
        super().__init__(detail=detail, error_code=error_code, status_code=400)


class NotFoundError(AppError):
    def __init__(self, detail: str, error_code: str = "not_found") -> None:
        super().__init__(detail=detail, error_code=error_code, status_code=404)


class UpstreamServiceError(AppError):
    def __init__(
        self,
        detail: str = "A required upstream service is unavailable.",
        error_code: str = "upstream_unavailable",
    ) -> None:
        super().__init__(detail=detail, error_code=error_code, status_code=503)
