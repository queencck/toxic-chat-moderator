import httpx
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .serializers import ClassifyRequestSerializer, ClassifyResponseSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def classify(request):
    """Send a chat message to the ML model server for toxicity classification."""
    serializer = ClassifyRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    text = serializer.validated_data['text']

    try:
        response = httpx.post(
            f"http://{settings.ML_MODEL_SERVER_URL}/api/v1/classify",
            json={
                "text": text,
                "sender": serializer.validated_data.get("sender", ""),
                "source": serializer.validated_data.get("source", ""),
            },
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.ConnectError:
        return Response(
            {"error": "ML model server is unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except httpx.HTTPStatusError as e:
        return Response(
            {"error": f"ML model server returned {e.response.status_code}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except httpx.TimeoutException:
        return Response(
            {"error": "ML model server request timed out"},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )

    result = response.json()
    response_serializer = ClassifyResponseSerializer(data={
        "text": text,
        "sender": serializer.validated_data.get("sender", ""),
        "source": serializer.validated_data.get("source", ""),
        **result,
    })
    if response_serializer.is_valid():
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    return Response(response_serializer.errors, status=status.HTTP_502_BAD_GATEWAY)
