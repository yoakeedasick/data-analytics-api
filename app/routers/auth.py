from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, RegisterRequest, TokenResponse, RefreshRequest, UserResponse,
    UpdateProfileRequest, UpdatePasswordRequest
)
from app.middleware.auth_middleware import get_current_user
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        user_id=str(user.user_id),
        email=user.email,
        full_name=user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and return JWT access + refresh tokens."""
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    return TokenResponse(
        access_token=create_access_token(str(user.user_id)),
        refresh_token=create_refresh_token(str(user.user_id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Issue a new access token using a valid refresh token."""
    user_id_str = decode_token(body.refresh_token, expected_type="refresh")

    import uuid
    user = db.query(User).filter(User.user_id == uuid.UUID(user_id_str)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user_id_str),
        refresh_token=create_refresh_token(user_id_str),
    )


@router.put("/profile", response_model=UserResponse)
def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile settings (full name)."""
    current_user.full_name = body.full_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve details of the currently logged-in user."""
    return current_user


@router.put("/password")
def update_password(
    body: UpdatePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}
