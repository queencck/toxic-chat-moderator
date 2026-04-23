from django.contrib.auth import authenticate
from django.db import IntegrityError
from ninja import Router
from ninja_jwt.tokens import RefreshToken

from .models import User
from .schemas import (
    ErrorSchema,
    LoginRequestSchema,
    LoginResponseSchema,
    RegisterRequestSchema,
    RegisterResponseSchema,
    UserSchema,
)

router = Router()


@router.post('/register/', response={201: RegisterResponseSchema, 400: ErrorSchema}, auth=None)
def register(request, payload: RegisterRequestSchema):
    """Register a new user"""
    data = payload.dict(exclude={'password2'})
    password = data.pop('password')
    try:
        user = User.objects.create_user(**data, password=password)
    except IntegrityError:
        return 400, {'detail': 'Username or email already exists.'}

    return 201, {
        'message': 'User registered successfully',
        'user': UserSchema.from_orm(user),
    }


@router.post('/login/', response={200: LoginResponseSchema, 401: ErrorSchema}, auth=None)
def login(request, payload: LoginRequestSchema):
    """Login user and return JWT tokens"""
    user = authenticate(username=payload.username, password=payload.password)
    if not user:
        return 401, {'detail': 'Invalid credentials'}

    refresh = RefreshToken.for_user(user)
    return 200, {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSchema.from_orm(user),
    }
