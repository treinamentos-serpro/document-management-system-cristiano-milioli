---
description: Refatora testes do módulo backend.
name: organizar-testes
argument-hint: caminho do modulo (ex. backend/src/services/documents.service.js)
agent: agent
---

# Organizar testes do backend

Refatore os testes automatizados para o módulo `${input:modulo:caminho do modulo}` mantendo o funcionamento com o runner nativo `node:test` e `node:assert`.

Requisitos:

- Busque os testes automatizados já criados na pasta `test`.
- Quebre os testes em arquivos separados agrupando por assunto.    
- Mantenha os testes isolados e legíveis.
- Coloque os testes em `backend/test`.
- Não dependa de serviços externos. Use o filesystem local quando necessário.
