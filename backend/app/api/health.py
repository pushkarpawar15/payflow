from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "service": "payflow", "version": "1.0.0"}
