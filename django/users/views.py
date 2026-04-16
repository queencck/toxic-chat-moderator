from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.authentication import TokenAuthentication

from .models import Bot
from .serializers import (
    BotSerializer,
    BotActionResponseSerializer,
    CreateBotRequestSerializer,
    LinkBotRequestSerializer,
    LoginRequestSerializer,
    LoginResponseSerializer,
    RegisterRequestSerializer,
    UserSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    request_serializer = RegisterRequestSerializer(data=request.data)
    if request_serializer.is_valid():
        user = request_serializer.save()

        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)
        
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
    response_serializer = BotSerializer(bots, many=True)
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

    response_serializer = BotActionResponseSerializer({
        'message': 'Bot linked successfully',
        'bot_id': bot.uuid,
        'user_id': request.user.uuid,
    })
    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_bot(request):
    """Create a new bot instance (called by Discord bot on guild join)"""
    request_serializer = CreateBotRequestSerializer(data=request.data)
    if not request_serializer.is_valid():
        return Response(request_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    platform = request_serializer.validated_data['platform']
    group_identifier = request_serializer.validated_data['group_identifier']
    group_name = request_serializer.validated_data['group_name']
    bot = Bot.objects.filter(platform=platform, group_identifier=group_identifier).first()
    if bot:
        response_serializer = BotActionResponseSerializer({
            'message': 'Existing bot found and returned successfully',
            'bot_id': bot.uuid,
        })
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    bot = Bot.objects.create(
        platform=platform,
        group_identifier=group_identifier,
        group_name=group_name
    )

    response_serializer = BotActionResponseSerializer({
        'message': 'Bot created successfully',
        'bot_id': bot.uuid,
    })
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)
