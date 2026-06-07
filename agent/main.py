"""Entry point — starts the Tex2Film agent FastAPI server."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "agent.server:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info",
    )
