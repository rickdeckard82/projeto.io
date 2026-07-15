import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * Filtro global de exceções (`@Catch()` sem tipo, então intercepta qualquer
 * erro lançado durante o request) que normaliza toda resposta de erro da API
 * para o formato consistente `{ statusCode, message }`, independente de a
 * exceção ser uma `HttpException` conhecida (ex.: `ForbiddenException`) ou um
 * erro inesperado. Isso permite que o frontend trate erros de forma uniforme
 * sem precisar conhecer o shape interno de cada tipo de exceção, e evita
 * vazar stack traces/detalhes internos em erros não tratados (mensagem
 * genérica "Erro interno do servidor").
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * Extrai status e mensagem da exceção e escreve a resposta JSON padronizada.
   * @param exception - erro capturado, tipicamente uma `HttpException` ou um erro não tratado
   * @param host - dá acesso ao contexto HTTP (request/response) do Nest
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : { message: 'Erro interno do servidor' };

    const message = typeof body === 'string' ? body : (body as any).message;

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
