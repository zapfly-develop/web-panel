# Implementação do GeocodingService

## Resumo

Implementação do serviço de geocoding para o módulo Delivery do ZapFly, utilizando a biblioteca oficial do Google Maps (`@googlemaps/google-maps-services-js`) com cache Redis.

## Arquivos Criados/Modificados

### 1. `src/modules/delivery/services/geocoding.service.ts` (NOVO)

Serviço principal de geocoding com:

- Integração com Google Maps API
- Cache Redis com TTL de 30 dias
- Enriquecimento automático de endereços
- Método Haversine para cálculo de distância

### 2. `src/modules/delivery/delivery.module.ts` (ATUALIZADO)

Módulo atualizado para incluir o `GeocodingService` nos providers e exports.

## Instalação de Dependências

Antes de usar o serviço, instale a biblioteca oficial do Google Maps:

```bash
npm install @googlemaps/google-maps-services-js
```

## Configuração de Ambiente

Adicione a seguinte variável ao arquivo `.env`:

```env
MAPS_API_KEY=sua_chave_api_google_maps_aqui
```

**IMPORTANTE:** Certifique-se de que as seguintes APIs estão habilitadas no Google Cloud Console:

- Geocoding API
- Maps JavaScript API (opcional, se for usar no frontend)

## Funcionalidades Implementadas

### 1. Método `getCoordinates`

Obtém coordenadas geográficas a partir de um endereço.

**Parâmetros:**

- `address`: Endereço do cliente (rua, número, bairro)
- `city`: Cidade
- `state`: Estado (UF)

**Retorno:**

```typescript
{
    latitude: number; // Coordenada latitude (compatível com float8 do Postgres)
    longitude: number; // Coordenada longitude (compatível com float8 do Postgres)
    formattedAddress: string; // Endereço formatado retornado pelo Google
}
```

**Exemplo de uso:**

```typescript
const result = await geocodingService.getCoordinates(
    "Rua das Flores, 123",
    "São Paulo",
    "SP",
);

console.log(result);
// {
//   latitude: -23.5505199,
//   longitude: -46.6333094,
//   formattedAddress: "R. das Flores, 123 - São Paulo, SP, Brazil"
// }
```

### 2. Método `getDistanceInKm`

Calcula a distância em quilômetros entre dois pontos usando a fórmula de Haversine.

**Parâmetros:**

```typescript
{
    lat1: number; // Latitude do ponto 1
    lon1: number; // Longitude do ponto 1
    lat2: number; // Latitude do ponto 2
    lon2: number; // Longitude do ponto 2
}
```

**Retorno:** `number` (distância em quilômetros)

**Exemplo de uso:**

```typescript
const distance = geocodingService.getDistanceInKm({
    lat1: -23.5505199,
    lon1: -46.6333094,
    lat2: -23.5629,
    lon2: -46.6544,
});

console.log(`Distância: ${distance.toFixed(2)} km`);
// Distância: 2.45 km
```

## Sistema de Cache

### Estratégia de Cache

- **Chave:** `geo_cache:${endereco_completo_normalizado}`
- **TTL:** 30 dias (2.592.000 segundos)
- **Normalização:** O endereço é convertido para minúsculas e trimado antes de ser usado como chave

### Exemplo de Chave de Cache

Para o endereço "Rua das Flores, 123, São Paulo - SP, Brazil":

```
geo_cache:rua das flores, 123, são paulo - sp, brazil
```

### Benefícios do Cache

1. **Redução de custos:** Evita chamadas repetidas à API do Google
2. **Performance:** Respostas instantâneas para endereços já consultados
3. **Confiabilidade:** Menos dependência da disponibilidade da API externa

## Enriquecimento de Endereços

O serviço automaticamente enriquece o endereço fornecido seguindo o padrão:

```
${address}, ${city} - ${state}, Brazil
```

**Exemplo:**

- **Entrada:** address="Rua das Flores, 123", city="São Paulo", state="SP"
- **Endereço enriquecido:** "Rua das Flores, 123, São Paulo - SP, Brazil"

Isso melhora significativamente a precisão dos resultados da geocodificação.

## Tratamento de Erros

### 1. ZERO_RESULTS

Quando o Google Maps não encontra resultados:

```typescript
// Log de erro é gerado:
// [getCoordinates] ZERO_RESULTS para endereco: Rua Inexistente, 999, Cidade Fictícia - XX, Brazil

// Exception lançada:
throw new Error("Nenhum resultado encontrado para o endereco: ...");
```

### 2. Status Não-OK

Para qualquer status diferente de "OK":

```typescript
// Log de erro:
// [getCoordinates] Google Maps API retornou status: REQUEST_DENIED para endereco: ...

// Exception lançada:
throw new Error("Erro ao buscar coordenadas: REQUEST_DENIED");
```

### 3. MAPS_API_KEY não configurada

```typescript
throw new Error("MAPS_API_KEY nao configurada");
```

### 4. Validações de Entrada

```typescript
// address vazio ou null
throw new Error("Endereco e obrigatorio");

// city vazio ou null
throw new Error("Cidade e obrigatoria");

// state vazio ou null
throw new Error("Estado e obrigatorio");
```

## Logging

O serviço implementa logging detalhado:

### Cache Hit

```
[getCoordinates] cache hit para: Rua das Flores, 123, São Paulo - SP, Brazil
```

### Coordenadas Obtidas

```
[getCoordinates] coordenadas obtidas para Rua das Flores, 123, São Paulo - SP, Brazil: lat=-23.5505199, lng=-46.6333094
```

### Erros de Cache

```
[getFromCache] falha ao buscar cache: Connection refused
[saveToCache] falha ao salvar cache: Connection refused
```

### Erros do Redis (não bloqueiam operação)

```
[redis] falha no geocoding: ECONNREFUSED
```

## Integração com o Módulo Delivery

O `GeocodingService` está disponível para injeção em qualquer serviço do módulo Delivery:

```typescript
import { Injectable } from "@nestjs/common";
import { GeocodingService } from "./services/geocoding.service";

@Injectable()
export class DeliveryOrderService {
    constructor(private readonly geocodingService: GeocodingService) {}

    async createDeliveryWithCoordinates(
        address: string,
        city: string,
        state: string,
    ) {
        // Obtém coordenadas
        const { latitude, longitude } =
            await this.geocodingService.getCoordinates(address, city, state);

        // Usa as coordenadas para criar a entrega
        // ...
    }
}
```

## Observações Importantes

### 1. Relação com PricingService

O `PricingService` já possui um método `calculateHaversineDistanceKm`. O método `getDistanceInKm` do `GeocodingService` oferece a mesma funcionalidade, mas com uma interface simplificada. Ambos podem coexistir:

- Use `GeocodingService.getDistanceInKm` para cálculos isolados de distância
- Use `PricingService.calculateHaversineDistanceKm` dentro do contexto de precificação de entregas

### 2. Coordenadas no Prisma

As coordenadas retornadas são do tipo `number` (JavaScript), compatíveis com o tipo `Float` (float8) do PostgreSQL:

```prisma
model Delivery {
    pickupLatitude      Float?
    pickupLongitude     Float?
    destinationLatitude Float?
    destinationLongitude Float?
}
```

### 3. Custo da API do Google

- **Geocoding API:** ~$5 USD por 1.000 requisições
- O cache de 30 dias ajuda a minimizar custos
- Configure limites de uso no Google Cloud Console para evitar custos inesperados

### 4. Rate Limits

O Google Maps impõe rate limits:

- **Usuários gratuitos:** 50 requisições por segundo
- **Clientes pagos:** Até 100 requisições por segundo

O cache ajuda a evitar atingir esses limites.

## Casos de Uso

### 1. Criação de Delivery com Geocoding

```typescript
async createDeliveryFromAddress(orderId: string) {
    const order = await this.prisma.order.findUnique({
        where: { id: orderId }
    });

    // Extrai cidade e estado do endereço (implementação simplificada)
    const city = "São Paulo";
    const state = "SP";

    // Obtém coordenadas do destino
    const destination = await this.geocodingService.getCoordinates(
        order.deliveryAddress,
        city,
        state
    );

    // Cria a delivery com coordenadas
    return this.prisma.delivery.create({
        data: {
            orderId,
            destinationAddress: destination.formattedAddress,
            destinationLatitude: destination.latitude,
            destinationLongitude: destination.longitude,
            // ... outros campos
        }
    });
}
```

### 2. Cálculo de Distância e Precificação

```typescript
async calculateDeliveryPrice(
    storeAddress: string,
    customerAddress: string,
    city: string,
    state: string
) {
    // Geocodifica endereço da loja
    const store = await this.geocodingService.getCoordinates(
        storeAddress,
        city,
        state
    );

    // Geocodifica endereço do cliente
    const customer = await this.geocodingService.getCoordinates(
        customerAddress,
        city,
        state
    );

    // Calcula distância
    const distanceKm = this.geocodingService.getDistanceInKm({
        lat1: store.latitude,
        lon1: store.longitude,
        lat2: customer.latitude,
        lon2: customer.longitude
    });

    // Usa PricingService para calcular preço
    const pricing = this.pricingService.calculateDeliveryPrice({
        distanceMeters: distanceKm * 1000,
        // ... outros parâmetros
    });

    return {
        distanceKm,
        pricing
    };
}
```

## Integração Atual

- `StoreAddressService` usa `GeocodingService.getCoordinates` ao cadastrar/atualizar o endereco da loja.
- O endereco estruturado fica em `StoreAddress`, com rua, numero, bairro, complemento, cidade, estado, CEP, endereco formatado, latitude e longitude.
- `DeliveryService` usa `StoreAddress` como origem da corrida, geocodifica o destino do cliente usando cidade/estado da loja e calcula distancia por Haversine antes de chamar `PricingService`.
- `User.storeAddress` e mantido como espelho textual para compatibilidade com checkout e exibicao existentes.

## Próximos Passos Sugeridos

1. **Testes Unitários:** Criar testes para o `GeocodingService` e `StoreAddressService`.
2. **Extração de Cidade/Estado do Cliente:** caso a operacao passe a atender multiplas cidades, capturar cidade/estado tambem no endereco do cliente.
3. **Monitoring:** Adicionar métricas de uso da API do Google.
4. **Fallback:** Implementar fallback para quando a API estiver indisponível.

## Referências

- [Google Maps Services JS](https://github.com/googlemaps/google-maps-services-js)
- [Geocoding API Documentation](https://developers.google.com/maps/documentation/geocoding)
- [Google Cloud Console](https://console.cloud.google.com/)
