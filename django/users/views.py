from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Bot
from .serializers import (
    LinkBotRequestSerializer,
    LinkBotResponseSerializer,
    ListBotResponseSerializer,
    LoginRequestSerializer,
    LoginResponseSerializer,
    RegisterRequestSerializer,
    RegisterResponseSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    request_serializer = RegisterRequestSerializer(data=request.data)
    if request_serializer.is_valid():
        user = request_serializer.save()

        response_serializer = RegisterResponseSerializer({
            'message': 'User registered successfully',
            'user': user
        })
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login user and return JWT tokens"""
    request_serializer = LoginRequestSerializer(data=request.data)
    if request_serializer.is_valid():
        user = request_serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        response_serializer = LoginResponseSerializer({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user
        })
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_bots(request):
    """List all bots linked to the authenticated user"""
    bots = Bot.objects.filter(user=request.user)
    response_serializer = ListBotResponseSerializer(bots, many=True)
    return Response(response_serializer.data, status=status.HTTP_200_OK)



@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def link_bot(request):
    """Link a bot to the authenticated user"""
    request_serializer = LinkBotRequestSerializer(data=request.data)
    if not request_serializer.is_valid():
        return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        bot = Bot.objects.get(uuid=request_serializer.validated_data['bot_id'])
    except Bot.DoesNotExist:
        return Response({'error': 'Bot not found'}, status=status.HTTP_404_NOT_FOUND)

    bot.user = request.user
    bot.save(update_fields=['user'])

    response_serializer = LinkBotResponseSerializer({
        'message': 'Bot linked successfully',
        'bot_id': bot.uuid,
        'user_id': request.user.uuid,
    })
    return Response(response_serializer.data, status=status.HTTP_200_OK)
