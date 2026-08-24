from fastapi import APIRouter, HTTPException, status
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.database import db
from app.utils.security import hash_password, verify_password, create_access_token
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    user_dict = {
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password)
    }

    result = await db.users.insert_one(user_dict)

    return {
        "id": str(result.inserted_id),
        "name": user.name,
        "email": user.email
    }

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    # Find user by email
    db_user = await db.users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Create token
    access_token = create_access_token(data={"sub": str(db_user["_id"])})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }