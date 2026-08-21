def api_response(success, message, data=None, error=None):
    return {
        "success": success,
        "message": message,
        "data": data,
        "error": error
    }