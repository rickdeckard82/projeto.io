import { Controller, Delete, Get, MethodNotAllowedException, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { readApiKey } from '../api-keys/api-keys.service.js';
import { AllowApiKey } from '../common/decorators/allow-api-key.decorator.js';
import { createMcpServer } from './mcp-server.js';

/**
 * Endpoint MCP (`/api/v1/mcp`, Streamable HTTP sem sessão). As ferramentas chamam a própria API por
 * HTTP com a chave de quem chamou, para que guards, DTOs e auditoria continuem valendo.
 */
@Controller('mcp')
export class McpController {
  @AllowApiKey()
  @Post()
  async handle(@Req() req: Request, @Res() res: Response) {
    // Só chave de API: aceitar o cookie de sessão abriria o endpoint a CSRF.
    const apiKey = readApiKey(req.headers.authorization);
    if (!apiKey) {
      throw new UnauthorizedException('O MCP exige uma chave de API');
    }

    const server = createMcpServer(async (method, path, body) => {
      const response = await fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/v1${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Preserva a origem real no rate limit e na auditoria (`trust proxy` = 1).
          'X-Forwarded-For': req.ip ?? '',
          'User-Agent': req.get('user-agent') ?? 'mcp',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error([data.message].flat().join('; '));
      }
      return data;
    });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => void server.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  /** Sem sessão não há stream nem encerramento: o protocolo pede 405. */
  @AllowApiKey()
  @Get()
  stream() {
    throw new MethodNotAllowedException();
  }

  @AllowApiKey()
  @Delete()
  endSession() {
    throw new MethodNotAllowedException();
  }
}
