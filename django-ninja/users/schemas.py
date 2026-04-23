from uuid import UUID

from ninja import Schema
from pydantic import Field, model_validator


class UserSchema(Schema):
    uuid: UUID
    username: str
    email: str


class RegisterRequestSchema(Schema):
    username: str
    email: str
    password: str = Field(min_length=8)
    password2: str = Field(min_length=8)
    first_name: str = ''
    last_name: str = ''

    @model_validator(mode='after')
    def passwords_match(self):
        if self.password != self.password2:
            raise ValueError("Passwords don't match.")
        return self


class RegisterResponseSchema(Schema):
    message: str
    user: UserSchema


class LoginRequestSchema(Schema):
    username: str
    password: str


class LoginResponseSchema(Schema):
    access: str
    refresh: str
    user: UserSchema


class ErrorSchema(Schema):
    detail: str
