// src/services/pain002Builder.ts
// Builds pain.002.001.10 XML responses for the RtP Creation API.

import { randomUUID } from 'crypto'

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

export function buildAccpResponse(originalMsgId: string, rtpTransactionId: string): string {
  const msgId = randomUUID()
  const creDtTm = nowIso()
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.10">
  <CstmrPmtStsRpt>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>${originalMsgId}</OrgnlMsgId>
      <GrpSts>ACCP</GrpSts>
    </OrgnlGrpInfAndSts>
    <OrgnlPmtInfAndSts>
      <TxInfAndSts>
        <OrgnlInstrId>${rtpTransactionId}</OrgnlInstrId>
        <TxSts>ACCP</TxSts>
      </TxInfAndSts>
    </OrgnlPmtInfAndSts>
  </CstmrPmtStsRpt>
</Document>`
}

export function buildRjctResponse(
  originalMsgId: string,
  reasonCode: string,
  additionalInfo: string
): string {
  const msgId = randomUUID()
  const creDtTm = nowIso()
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.10">
  <CstmrPmtStsRpt>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>${originalMsgId}</OrgnlMsgId>
      <GrpSts>RJCT</GrpSts>
    </OrgnlGrpInfAndSts>
    <OrgnlPmtInfAndSts>
      <TxInfAndSts>
        <TxSts>RJCT</TxSts>
        <StsRsnInf>
          <Rsn>
            <Cd>${reasonCode}</Cd>
          </Rsn>
          <AddtlInf>${additionalInfo}</AddtlInf>
        </StsRsnInf>
      </TxInfAndSts>
    </OrgnlPmtInfAndSts>
  </CstmrPmtStsRpt>
</Document>`
}

// Duplicate detected — returns original ID with ED05.
export function buildDuplicateResponse(
  originalMsgId: string,
  existingRtpTransactionId: string
): string {
  const msgId = randomUUID()
  const creDtTm = nowIso()
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.10">
  <CstmrPmtStsRpt>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
    </GrpHdr>
    <OrgnlGrpInfAndSts>
      <OrgnlMsgId>${originalMsgId}</OrgnlMsgId>
      <GrpSts>RJCT</GrpSts>
    </OrgnlGrpInfAndSts>
    <OrgnlPmtInfAndSts>
      <TxInfAndSts>
        <OrgnlInstrId>${existingRtpTransactionId}</OrgnlInstrId>
        <TxSts>RJCT</TxSts>
        <StsRsnInf>
          <Rsn>
            <Cd>ED05</Cd>
          </Rsn>
          <AddtlInf>Duplicate request — original ID returned</AddtlInf>
        </StsRsnInf>
      </TxInfAndSts>
    </OrgnlPmtInfAndSts>
  </CstmrPmtStsRpt>
</Document>`
}
