Shared
Canada’s new real-time payment system policy framework
Real-Time Rail consultation
document
payments.ca
TABLE OF CONTENTS
Key definitions 3
Executive summary 6
Introduction 7
Overview of Payments Canada 7
The Canadian Payments Act 8
Canadian Payments Act membership expansion 10
The Real-Time Rail 10
Foundational requirements of the RTR 11
Real-Time Rail Access Model Overview 12
RTR participation types and relevant requirements 14
RTR financial risk framework 16
RTR Exchange 19
RTR Exchange capabilities 19
RTR Clearing and Settlement 21
Third Party Exchange 21
RTR compliance overview 22
Member compliance framework 22
Compliance escalations 22
Member and system incidents 23
Incident notification requirements 24
Emergency conditions 24
RTR exceptions and returns 25
Exception handling 25
Returns 26
Claims or complaints 27
RTR fraud management 28
Payments Canada’s fraud approach 28
Strategic objectives of the RTR fraud strategy 28
Third-party fraud service providers 29
Participant fraud requirements 29
Centralized fraud services 29
1
Shared
Internal fraud control standards 32
Reporting and timeliness 32
Contracts with non-participants 33
Fraud monitoring 33
Next steps 33
Appendices 34
2
Shared
Key definitions
Authorized Fraud means the intentional misrepresentation committed by a person who is or is
purporting to be the intended Payee, which results in the authorized initiation of an RTR Payment
Message by a Payor or by an authorized agent of the Payor.
Central Fraud Analytics means the centrally managed tool operated by or on behalf of the
Association that detects patterns of fraudulent behaviour, generates the Fraud Score, and enables
a Participant to track, analyze and report on its fraud risk exposure.
Central Fraud Reporting means the reporting tool operated by or on behalf of the Association
that generates fraud statistics.
Central Risk List means the centrally managed database operated by or on behalf of the
Association that contains a list of Suspected Fraud or Confirmed Fraud entries.
Clearing means the process of transmitting, reconciling and, in some cases, confirming payment
orders prior to settlement, possibly including the netting of instructions and the establishment of
final positions for settlement.
Competitive Service means a payment scheme, product, or service, other than the service of a
Connection Service Provider as defined in this Rule, identified in the RTR Payment Message that
supports the processing of an RTR Payment Message.
Confirmed Fraud means an RTR Payment Message that has been identified by the Participant as
either an Unauthorized RTR Payment or an Authorized RTR Payment Fraud.
Confirmation of Payee means the centrally managed tool operated by or on behalf of the
Association that verifies a Payee's name against the account number before payment initiation.
Connection Service Provider means an entity, identified in the RTR Payment Message, that
connects a Participant to the RTR Exchange to facilitate the exchange of RTR payment messages
with the RTR Exchange on behalf of that Participant.
Direct Settlement Participant means a participant whose RTR payment obligations are cleared
and settled through its settlement account.
3
Shared
Exchange means the delivery and receipt of payment instructions, which would result in a debit
and credit being posted to the accounts of the Payor and Payee.
Fraud Control Standards means the Participant requirements for the mitigation of fraud.
Fraud Score means the numerical output of the Central Fraud Analytics that indicates the
likelihood of fraudulent behaviour with respect to an RTR Payment Message.
Indirect Settlement Participant means a participant whose RTR payment obligations are cleared
and settled through the settlement account of a Settlement Agent.
Member Non-participant means a member that is not a participant but wishes to offer real-time
payments to their customers that will be exchanged, cleared and settled via the RTR System,
using the services of a Direct Settlement Participant.
```
Payee means the end-user (person or organization) to whom the fixed amount set out in a
```
payment message is to be paid or credited. Also known as creditor.
Payment Capacity means an amount in the RTR Clearing and Settlement ledger that reflects the
net liquidity position of a Direct Settlement Participant.
```
Payor means the end-user (person or organization) who sends funds from their payment account
```
to the Payee through initiating an RTR Payment. Also known as debtor.
Real-Time Gross Settlement means that each payment is settled individually as soon as the
transfer order is submitted and accepted for settlement.
RTR Payment Message means a Payment Message that is, or is to be, exchanged in the RTR
Exchange
RTR Payment Obligation means the obligation of a Participant to pay another Participant a fixed
amount in RTR Clearing and Settlement.
RTR Participant means a Member whose application to participate in the RTR system has been
approved.
4
Shared
Sending Participant means a Participant who, in an RTR Payment Message or in Settlement
Instructions, is identified as the Participant who is to pay the fixed amount set out in the RTR
Payment Message or in those instructions.
Settlement Agent means a Direct Settlement Participant that is approved to clear and settle RTR
payment obligations in the RTR Clearing and Settlement on behalf of Indirect Settlement
Participants.
Settlement Instructions means information that sets out the details necessary for clearing and
settlement of an RTR Payment Obligation in RTR Clearing and Settlement.
Suspected Fraud means an RTR Payment Message that a Participant has reason to believe is
fraudulent but not yet confirmed as such.
Third Party Exchange means a payment exchange that, under an agreement with the
Association, may submit settlement instructions to RTR Clearing and Settlement.
Unauthorized Fraud means an RTR Payment Message initiated by a person other than the person
or persons who are authorized to do so.
User means a person who is a user of payment services but is not a member.
5
Shared
Executive summary
Payments Canada is publishing this document to consult on the draft RTR By-law and1
```
fundamental policy proposals of the Real-Time Rail (RTR). Payments Canada invites comments
```
on the information set out in this consultation and requests that respondents consolidate
feedback from within their organization into one submission. Feedback will help inform the RTR
legal framework.
Please provide input in writing no later than Wednesday, July 2, 2025, to
consultation@payments.ca.
The draft RTR By-law and policy proposals have been developed through extensive consultation
with members and regulators. They have also been bolstered by in-depth feedback and dialogue
conducted through targeted consultations with a number of stakeholders, representing the
diverse perspectives of the payment industry and end users.
In 2020, Payments Canada consulted on the overarching RTR system and policies. While several
policy elements remain consistent with the RTR consultation in 2020, this document includes
new components reflecting the new design and implementation of the RTR. Additionally, the draft
RTR By-law and the RTR rules are included in appendices to promote transparency in Payments
Canada’s consultation process. Payments Canada invites public comment on the draft RTR
By-Law. The RTR rules have been provided to support the understanding of the elements of the
RTR.
To promote the transparency of the engagement process, Payments Canada may make public
some or all of the responses received. In order to respect privacy and confidentiality, when
providing your response please indicate whether you:
```
● Consent to the disclosure of your submission;
```
```
● Request that your identity and any personal identifiers be removed prior to publication; or
```
```
● Wish any portions of your submission be kept confidential (with the confidential portions
```
```
clearly identified).
```
1 Please see Appendix II for the draft RTR By-Law.
6
Shared
Introduction
Payments Canada is responsible for establishing and operating Canada’s national payment
clearing and settlement infrastructure. Payments Canada operates within its mandate and public
policy objectives in order to provide rules and policies for the payment systems it operates: Lynx,
```
the Automated Clearing Settlement System (ACSS) and the forthcoming Real-Time Rail.
```
The RTR is designed to support instant, irrevocable and data-rich payments that will enable
competition and innovation in Canada's financial ecosystem, while providing Canadians more
control over their finances. The RTR is expected to be designated as a prominent payment
```
system (PPS) and will meet the Bank of Canada’s Risk Management Standards.
```
The RTR has the following public policy objectives:
● Sound legal framework: Clear and transparent rules within Payments Canada’s mandate
and public policy objectives.
● Fair and open, risk-based access: Enable innovation, competition and a level playing field
```
given:
```
```
○ Access requirements are functional and risk-based;
```
```
○ Multiple participation options are available, and;
```
```
○ Participation requirements facilitate Payment Service Provider (PSP) access (once
```
```
the Canadian Payments Act is amended).
```
● Ubiquity: Wide reach to the vast majority of Canadian deposit accounts.
Overview of Payments Canada
Payments Canada is a public-purpose organization, responsible for establishing and operating
critical national payment clearing and settlement infrastructure. In 2024, Lynx and the ACSS
cleared and settled $107 trillion, more than $424 billion every business day. Due to their
significance within Canada’s economy, both are designated and overseen by the Bank of Canada
```
under the Payment Clearing and Settlement Act (PCSA).
```
7
Shared
Figure 1: Payments Canada legal framework
Canadian Payments Act
Established by Parliament
Enabling legislation sets
out governance, mandate
and the types of entities
eligible for membership.
Regulations
Established by Governor
in Council
Set out additional
requirements or
conditions on
membership eligibility
By-laws
Approved by Minister*
Define fundamental public
policy elements of
systems, including
settlement, finality and
eligibility for direct
participation**.
Rules, standards and
policy statements
Established by Payments
Canada
Set out operational,
technical and risk based
requirements for all
members.
```
*By-laws made pursuant to paragraph 18(1)(k) of the Canadian Payments Act are made by the Board of Directors and are not subject
```
to Ministerial approval.
** The Bank of Canada sets out eligibility criteria and requirements for access to settlement accounts.
The Canadian Payments Act
Payments Canada was established by Parliament in 1980, through the Canadian Payments Act
```
(CP Act), which sets out our mandate, governance, oversight and the types of organizations
```
eligible for membership.
Mandate
```
Payments Canada’s objects, pursuant to subsection 5(1) of the CP Act are to:
```
● Establish and operate national systems for the clearing and settlement of payments and
```
other arrangements for the making or exchange of payments;
```
● Facilitate the interaction of its clearing and settlement systems and related arrangements
with other systems or arrangements involved in the exchange, clearing or settlement of
```
payments; and
```
● Facilitate the development of new payment methods and technologies.
In pursuing its objects, Payments Canada has a duty to promote the efficiency, safety and
soundness of its clearing and settlement systems and take into account the interests of Users.
Governance and oversight
Payments Canada is governed by and operates within a robust regulatory framework. The CP Act
sets out the oversight responsibilities of the Minister of Finance and the role of the Board of
Directors. Payments Canada’s Board of Directors may make by-laws and rules to support the
8
Shared
attainment of its objects. It also establishes two advisory councils: The Member Advisory Council
```
(MAC) and Stakeholder Advisory Council (SAC). Their purpose is to provide advice and counsel to
```
the board.
The oversight responsibilities of the Minister of Finance relative to Payments Canada include the
authority to review and disallow rules and to issue directives, including a directive to make, amend
or repeal a by-law, rule and standard. This legal framework supports the efficiency, safety and
soundness of Payments Canada’s systems.
The Payments Canada Board of Directors consists of a majority of independent directors which
```
includes the president and CEO, seven independent directors (including the chair) and five
```
member directors.
```
The Payment Clearing and Settlement Act (PCSA) assigns the Bank of Canada responsibility for
```
overseeing clearing and settlement systems for the purpose of controlling systemic risk and
payment system risk. The ACSS has been designated as a prominent payment system and Lynx
as a systemically important system. As such, this brings both systems under the oversight of the
Bank of Canada. It is expected that the RTR will be designated as a prominent payment system.
Payments Canada membership
The CP Act sets out Payments Canada’s membership requirements. In order to be eligible to
apply to participate on Payments Canada’s systems, a financial institution must be a member of
Payments Canada. Today, there are approximately 109 financial institution members of Payments
Canada.
As is described in the CP Act, Payments Canada members are in one of two categories of
```
membership: mandatory members or entitled members. Mandatory members include chartered
```
banks and entitled members are those that may choose to become members, for example credit
union centrals or life insurance companies.
All Payments Canada members will be eligible to become RTR Participants. Members interested
in becoming RTR Participants will need to complete an application process, and meet the
required participation requirements within the RTR rules and supporting documents.
Requirements for membership are outlined in the Membership Requirements Regulations and in
By-Law No. 1 - General.2
2 Payments Canada consulted on membership expansion in March 2025.
9
Shared
Value of membership
```
● Access to payment services (i.e., Financial Institutions File, Corporate Creditor
```
```
Identification Number).
```
● Eligibility to apply for seats on the Board of Directors, the Member Advisory Council and
other working groups.
● Access to member reports and other research.
● Eligibility to apply for system participation.
Membership and system participation
In order to become a system participant, Payments Canada members must meet the
participation requirements associated with each system as part of their application, which must
be approved by Payments Canada prior to participation. Each system is unique in its structure,
risk model and requirements for participation. Participation in one system does not guarantee nor
result in the participation in another.
Canadian Payments Act membership expansion
The amendments to the CP Act received Royal Assent in 2024. Once the amendments come into
force, Payments Canada membership eligibility will expand to include:3
● Payment service providers as defined in section 2 of the Retail Payment Activities Act that
perform retail payment activities, as defined in that section.
● Provincial credit union locals that are members of a central.
● Clearing houses as defined in section 2 of the PCSA of a clearing and settlement system
```
designated under subsection 4(1).
```
The Real-Time Rail
```
The RTR is a real-time gross settlement (RTGS) payment system that facilitates the exchange,
```
clearing and settlement of irrevocable payments in real-time, 24/7/365. As an RTGS system, the
RTR facilitates the final and immediate settlement of transactions between financial institutions
on a per transaction basis.
3 Amendments to the Canadian Payments Act will come into force at a time to be determined by the Governor in
Council.
10
Shared
Real-time payments are single credit transfer push payments. Once a payment is initiated on the
RTR, the payment must be exchanged, cleared and settled between the sending and receiving
financial institution within 10 seconds. Subject to certain exceptions, funds must be made
```
available to the Payee or recipient of the payment, within 60 seconds after settlement (see Figure
```
```
2).
```
Figure 2. Simple RTR payment flow
Foundational requirements of the RTR
The RTR is designed to uphold a set of foundational requirements that was derived from a
comprehensive process involving regulators, insights gained from international initiatives and
feedback from the domestic market.
● Always on 24/7/365 availability: Payment exchange including settlement, is available
```
any day of the year (including holidays), 24 hours a day.
```
● Funds availability: Funds made available to end user accounts within 60 seconds.
● Real-time processing: Payment exchange including settlement, completed within
seconds, with immediate funds and data available.
11
Shared
● Payment finality: An RTR payment cannot be cancelled, amended or recalled once sent
to the RTR and it is considered final and complete within seconds.
● Account number-based routing: Payment routing will be based on account numbers and
institution transit numbers. If alias is used in payment instructions, sending participants
of Competitive Services will be responsible to resolve them to account numbers prior to
the payment being submitted to the RTR.
● Payment Information: Use of ISO 20022, an international messaging standard which
enables rich data to travel with every payment.
● Ubiquitous reach: The RTR will enable widespread payment initiation and receipt, with
the ability to reach nearly every account in Canada.
● Robust risk management: Adherence to the Bank of Canada’s Prominent Payment
```
System (PPS) risk management standards to ensure safety and soundness of the RTR.
```
● Open and risk-based access: All Payments Canada members will be eligible to participate
in the RTR provided they meet the risk-based access criteria.
● Transaction transparency: Real-time notification of payment status, providing
transparency for Participants and end users.
The following sections provide additional key characteristics and requirements of the RTR
system.
Real-Time Rail Access Model Overview
As the RTR system is tiered based on settlement, members can apply to participate in the RTR
system as a:
● Direct Settlement Participant, if they are settling their own payments.
● Settlement Agent: if they are settling their own payments and payments on behalf of an
Indirect Settlement Participant.
● Indirect Settlement Participant if they use the services of a Settlement Agent to settle their
payments on their behalf.
Payments Canada members that are eligible for RTR participation but choose to leverage the
services of an RTR Participant to indirectly send and settle payments in the RTR must make
12
Shared
arrangements with an RTR Participant and are considered a Member Non-participant within the
RTR framework.
Figure 3. An overview of the participation-types
All entities providing real-time payment services will need to meet specific requirements related to
end-user experience, safety and soundness such as:
● Funds availability: Make funds available to customer accounts within 60 seconds.
● Recourse, errors and exceptions handling: Ensure appropriate dispute resolution, and
exceptions handling processes and procedures are in place.
● Fraud management: Ensure fraud management tools, procedures and fraud reporting
mechanisms are in place.
● Responsibility for service providers: Ensure that any entity that enters into an agreement
with a service provider for the performance of an activity or function is responsible for
ensuring that the activity or function is carried out by the service provider in accordance
with RTR By-law and rules.
● Incident notification: Responsibility for notifying of any operational incidents affecting the
entities’ ability to send and receive payments.
13
Shared
An additional requirement, Direct Settlement Participants and Indirect Settlement Participants
must be able to receive payments in the RTR Exchange.
RTR participation types and relevant requirements
The sections below provide high level requirements that Participants must meet. Entities
interested in RTR participation can reach out to Payments Canada to receive more detailed
Participant requirement documentation and information.
Direct Settlement Participant
Payments Canada members intending to become a Direct Settlement Participant must provide
Payments Canada with a completed application, and satisfy the following RTR By-law and rules
```
including:
```
● The applicant must demonstrate that it has established a restricted RTR settlement
account with the Bank of Canada.4
● The applicant must demonstrate that it meets the RTR operational requirements and has
completed the required training.5
● The applicant has completed all testing requirements.
● The applicant meets all other applicable technical, security and other requirements set out
in the RTR Service Level Description.
○ Includes requirements for any Member Non-participants the applicant might
support.
● The applicant must provide Payments Canada with the appropriate RTR payment
message routing information.
Settlement Agent
An RTR Direct Settlement Participant Intending to become an Settlement Agent must submit an
application form that it intends to act as a Settlement Agent and meet specific Settlement Agent
requirements in the RTR By-law and rules in addition to the Direct Settlement Participant
requirements, including:
5 See the appendices for more detail on the RTR’s operational requirements.
4 The Bank of Canada has dedicated settlement account policies for the RTR which encompass a set of criteria that
determine the types of entities granted a settlement account. For an overview of the Bank of Canada’s RTR settlement
account policies, see Appendix I.
14
Shared
● The applicant must demonstrate that it has established an unrestricted RTR settlement
account with the Bank of Canada.
● The applicant has completed the training and testing required to become a settlement
agent.
● The applicant must notify Payments Canada with the following information regarding their
Indirect Settlement Participants and/or Member Non-participants:
○ Name and financial institution number of the Indirect Settlement Participant or
Member Non-participant
○ The date on which the Settlement Agent will start acting on behalf of the Indirect
Settlement Participant or Member Non-participant
○ The payment exchange on which it will be acting on behalf of the Indirect
Settlement Participant or Member Non-participant
Settlement Agents will be responsible for managing the settlement risk between themselves and
their Indirect Settlement Participants.
Indirect Settlement Participant
Payments Canada members intending to become an Indirect Settlement Participant are required
to adhere to certain provisions in the RTR By-law and rules, including:
● Demonstrate that it has made arrangements with a Settlement Agent to clear and settle
RTR payments on its behalf and notify Payments Canada.
● Demonstrate that it meets the RTR operational requirements and has completed the
required training.6
● Complete all testing requirements.
● Meet all other applicable technical, security and other requirements set out in the RTR
Service Level Description.
● Provide Payments Canada with the appropriate RTR payment message routing
information.
Member Non-participant
```
The current RTR legal framework requires RTR Participants (Direct Settlement
```
```
Participant/Settlement Agent) to maintain contractual arrangements with Member
```
6 See Appendix III for more detail on the RTR’s operational requirements.
15
Shared
Non-participants for the provision of real-time payment exchange, clearing and settlement
services.7
RTR Participants providing services to Member Non-participants will be required to notify
Payments Canada of the following:
● A written agreement from each Member Non-participant for whom it exchanges real-time
payments that contains the minimum mandatory elements prescribed in the RTR rules.8
● The name of the Member Non-participant and participant identifier for whom they will
send or receive RTR payment messages.
● The date on which the Participant will start sending and receiving RTR payments on
behalf of the Member Non-participant.
RTR Participants are also required to report to the association the volumes and values sent and
received on behalf of Member Non-participants.
RTR financial risk framework
The financial risk framework is a critical component of the RTR’s broader risk management
framework. The financial risk framework is designed to uphold the integrity of the clearing and
settlement processes within the RTR while safeguarding participating institutions from financial
risks.
The financial risk framework is developed to fully observe the Bank of Canada’s Risk Management
Standards for prominent payment systems with the objective to ensure risk controls are
established that effectively and efficiently mitigate against financial risks. The RTR financial risk
framework provides measures that are intended to mitigate credit, liquidity and settlement risk, as
well as establishing controls that provide settlement finality in central bank money.
Risk management
Credit risk
The risk of loss arising from a participant failing to meet settlement obligations. The real-time
gross settlement for RTR clearing and settlement ensures that payments are final and irrevocable
8 See Appendix III for more details on mandatory requirements for MNPs.
7 In the absence of an agreement between an RTR Participant and a MNP for whom the Participant acts, any payment
initiated for the MNP shall be ineligible for exchange, clearing and settlement in the RTR.
16
Shared
between participants once they have been settled. Since settlement takes place in real time on a
fully funded basis, RTR clearing and settlement does not create credit risk between participants.
Liquidity and settlement risk
As these risks are typically intertwined in payment systems, they are also mitigated in unison, as
described below:
● Liquidity risk: This risk arises from a participant when they do not have a sufficient amount
of intraday liquidity to settle its payments.
● Settlement risk: This risk closely follows liquidity risk as lack of funds to settle further
heightens the risk that a payment does not settle within the required time.
In the context of RTR Clearing and Settlement, sufficient liquidity must be available in a sending
participant’s RTR settlement account to settle each individual payment in real-time. If not, the
payment will be rejected.
Financial risk controls
RTR Participants are provided with several risk control measures to identify, monitor and mitigate
financial risks in the RTR payment flow:
● Real-time gross settlement: The real-time gross settlement model is one of the defining
pillars of the RTR’s payments flow, ensuring that transactions are settled with finality on an
individual, line-by-line basis. The real-time gross settlement model ensures each RTR
payment is cleared and settled immediately, and in full between participant settlement
accounts.
● Pre-funded model: The pre-funded model complements the real-time gross settlement
model as it requires Direct Settlement Participants to maintain sufficient balances within
their respective settlement accounts, to ensure that payment obligations, both for
themselves and for represented Indirect Settlement Participants can immediately clear and
settle.
● Net Debit Cap: The RTR provides the functionality to Direct Settlement Participants acting as
Settlement Agents to manage and monitor credit and liquidity risks related to their
represented Indirect Settlement Participants by establishing a Net Debit Cap that limits the
Indirect Settlement Participant’s payment activity to a pre-determined threshold.
17
Shared
● Value Limits: A value limit per RTR transaction has been set for RTR Clearing and Settlement,
fixed at $100,000 CAD to align with the relevant financial and fraud risks controls9
participants may be subject to.
Liquidity management
The RTR provides Direct Settlement Participants with tools to monitor and manage their intraday
liquidity through the following:
● Real-time monitoring: The RTR provides participants with the functionality to monitor their
activities in real-time through the use of a dashboard that will allow for the monitoring of:
1. Financial status of settlement account balance from the start of the payment cycle
to real-time.
2. Transaction volumes which include the number and value of transactions
sent/received.
● Watermarks: As a tool to help participants manage liquidity risk, the RTR Clearing and
```
Settlement will include the ability for Direct Settlement Participants to set lower (a ‘minimum
```
```
balance’) and upper (a ‘maximum balance’) settlement account balance watermarks together
```
with their reset thresholds.
● Funding/defunding: Direct Settlement Participants will be required to fund their RTR
settlement account with sufficient liquidity to support the continuous settlement of RTR
payments. Participants will have the functionality to fund or defund their RTR settlement
account using Canada’s high-value payment system, Lynx. Participants who do not have their
own Lynx settlement account will have the flexibility to establish settlement arrangements
with Lynx participants, enabling them to conduct their funding and defunding activities
without direct access to Lynx. Funding and defunding requests are not subject to the RTR
value limit.
● Participant-to-Participant Transfers : The Participant-to-Participant transfers provide the
ability for two Participants to initiate and receive liquidity transfers through the RTR Clearing
and Settlement portal between their respective RTR settlement accounts. This functionality
will be available 24/7, but is expected to be leveraged when the primary funding/defunding
process is unavailable, either due to Lynx being closed or outside of funding cut-off times
9 Participants can choose to set lower limits for sending RTR Payment Messages than the current value limit.
18
Shared
defined by the Bank. There is no value limit placed on participant to participant transfers and
participants lending funds are entitled to claim interest compensation from the borrowing
Direct Settlement Participant.
RTR Exchange
The RTR Exchange facilitates the real-time exchange of payment messages between RTR
Participants. In order for the RTR Exchange to validate and accept RTR Payment Messages being
sent, Participants must meet the following payment message specifications:
```
● ISO 20022 message specifications, and;
```
● RTR Exchange API specifications.
Following receipt of the payment, receiving Participants must send a payment status acceptance
message to the RTR Exchange confirming the acceptance or the rejection of the payment. Once
this is complete, the RTR Exchange will generate and send a payment outcome report to the
sending participant indicating that the payment will or will not be settled. In the case of payment
acceptance, the funds will be reserved from the Participant’s RTR settlement account. RTR
Payment Messages submitted to the RTR Exchange are irrevocable and cannot be cancelled by
the sending Participant.
Payments successfully settled must have funds made available to the customer within 60
seconds from the receiving Participants’ receipt of the payment. Any data included within the RTR
Payment Message must be made available to the payee unless the payee specifies otherwise.
RTR Exchange capabilities
Connection Service Providers
A Connection Service Provider connects a Participant to the RTR Exchange and facilitates the
exchange of RTR Payment Messages with the RTR Exchange. A Participant can either connect
directly to the RTR Exchange, or use a Connection Service Provider.
A Connection Service Provider must:
```
● use Payments Canada’s API gateway(s);
```
● leverage ISO 20022 message specifications, in addition to API specifications and other
```
RTR ISO 20022 requirements;
```
19
Shared
● adhere to other technical, connectivity, and testing requirements in the RTR Service Level
```
Description and the RTR CSP Onboarding Guide;
```
```
● comply with relevant Payments Canada by-laws and rules; and
```
● provide contact information for support personnel.
Participants who wish to use a Connection Service Provider to connect to the Exchange must
ensure the following requirements are satisfied:
```
● The participant must register the Connection Service Provider with Payments Canada; and
```
● The participant must ensure that the activity or function carried out by the service provider
is in accordance with the RTR legal framework.
Competitive Services
A Competitive Service, sometimes referred to as an overlay service, is an optional payment
```
scheme, product, or service (other than the service of a Connection Service Provider) identified in
```
the RTR Payment Message that supports the processing of an RTR Payment Message.
Competitive Services provide additional services to Participants such as email-based routing,
payee verification and other payment functions.
Participants who wish to offer Competitive Services must ensure the following requirements are
```
satisfied:
```
```
● The Participant must register the Competitive Service with Payments Canada; and
```
● The Participant must ensure that the activity or function carried out by the service
provider is in accordance with the RTR legal framework.
Supporting the domestic leg of international transactions
The RTR will have the capability to support the domestic leg of international transactions. RTR
Payment Messages will have the capability to include payment related information from other
jurisdictions that are deemed as necessary information required for Receiving Participants to
meet reporting requirements. Through established banking channels, the foreign bank initiates a
payment that is compliant with global standards for cross-border payments. The RTR Sending
Participant will use the RTR to send the domestic leg of the transaction to the payee.
20
Shared
RTR Clearing and Settlement
The RTR Clearing and Settlement component facilitates the clearing and settlement of payments
that have been exchanged on the RTR Exchange, third-party exchanges, and
participant-to-participant transfers.
Only payments that meet the following payment message format and requirements will be settled
in the RTR Clearing and Settlement:
● The amount of the payment must not exceed the value limit of CAD $100,000.10
● Sufficient funds must be contained within the Participant’s settlement account for the
payment to be settled.
● In the case of a Settlement Agent, the settlement of the payment must not cause the
Indirect Settlement Participant’s net position to fall below the net debit cap set by the
settlement agent.
Third Party Exchange
A Third Party Exchange is a payment exchange that is approved to send payments to the RTR
Clearing and Settlement. These third-party exchanges are not required to operate in real-time, and
will not have to follow the requirements established for the RTR Exchange. RTR third-party
exchanges may maintain their own rules regarding message exchange and must ensure that their
rules do not conflict with the RTR Clearing and Settlement requirements. Third-party exchanges
must meet the RTR Clearing and Settlement rule requirements and are subject to the RTR
Financial Risk Framework.
Third-party Exchange providers wishing to connect to the RTR Clearing and Settlement
infrastructure must ensure the following requirements are satisfied:
```
● Must be registered with Payments Canada;
```
● Must meet contractual arrangements between Payments Canada and the Third Party
Exchange.
10 Participants can choose to set lower limits for sending RTR Payment Messages than the current value limit.
21
Shared
RTR compliance overview
Member compliance framework
Participants must comply with the requirements set out in the RTR By-law and rules. The member
compliance framework provides a high-level overview of the member compliance requirements,
monitoring and reporting activities. Participant requirements will be outlined in the RTR By-law,
rules and supporting documentation.
To ensure that Participants are complying with the requirements, monitoring activities will be
performed by Payments Canada. The observations from the monitoring activities are reported on
a quarterly and annual basis to the Bank of Canada, members and Payments Canada’s Board of
Directors.
Risk-based approach to compliance
Payments Canada uses a risk-based approach to compliance, meaning that the actions to
address potential contraventions are proportional to the impact of the potential contravention on
the safety and soundness of its system, its impact on other members or its impact on Payments
Canada.
Compliance escalations
A number of compliance escalations are available to Payments Canada in the case of alleged
contraventions by members.
In the case of an alleged contravention of requirements, Payments Canada’s first step would be to
contact the member alleged to be in contravention to request further information, evidence or a
meeting to discuss.
Under Canadian Payments Association By-law No. 6 — Compliance , an investigation of an alleged11
contravention may be initiated by the President of Payments Canada or by a member filing a
complaint. Following an investigation, if the President or a compliance panel determines there has
been a contravention, the President or compliance panel, as the case may be, may take one or
11 Payments Canada consulted on compliance enhancements in relation to membership expansion in March 2025.
22
Shared
more of the actions listed in section 16 of CPA By-law No. 6 - Compliance, including ordering that
the member pay a penalty.
Participant suspension
The RTR By-law provides that in certain pre-determined circumstances, the President must, and in
other situations may, suspend a Participant’s permission to participate in the RTR system.
The circumstances where the President may suspend are:
● Exceptional circumstances: If a federal or provincial regulatory or supervisory body
makes a declaration that the Participant is considered to be no longer viable or that it is
unable to meet its liabilities as they become due and further participation could adversely
affect the efficiency, safety, or soundness of the RTR system.
● Other: Includes reasons such as:
```
○ If the Indirect Settlement Participant does not have a Settlement Agent;
```
```
○ If the Participant no longer meets the RTR participation requirements; or
```
○ If the Participant has not paid applicable fees.
If the Direct Settlement Participant or Settlement Agent no longer has access to their RTR
settlement account from the Bank of Canada, their permission to participate in the RTR system
must be suspended.
Participant reinstatement
The Participant whose permission to participate in the RTR system is suspended or revoked may
submit an application to the President to have their permission to participate reinstated. The
President must reinstate the permission or approval if the application demonstrates that the
circumstances giving rise to the suspension or revocation no longer exist.
The President may refuse to approve the application for reinstatement. The Participant or
member may appeal the decision to the Board in writing within 30 calendar days of receipt of the
non-approval decision.
Member and system incidents
There are two types of member incidents as currently defined in the RTR rules:
23
Shared
Severity 1: An incident where a Participant’s RTR-related services are affected in a way that
threatens or harms the RTR system, including a cyber attack on a Participant’s system or service
or other large-scale Participant incidents.
Severity 2: An incident where a Participant is unable to exchange, clear or settle RTR Payment
Messages or make the funds available in accordance with the RTR rules but that does not
threaten or harm the RTR system.
Incident notification requirements
In the case of an incident, a Participant is required to notify the RTR Payment Operation Centre by
```
phone immediately, and in any event no later than five (5) minutes upon determining that an
```
incident has occurred. A Participant must submit a completed incident report form to Payments
Canada within 10 business days of the incident.
Payments Canada staff may request further information upon receipt and review of the
completed Participant incident report form. Additionally, Payments Canada will host an internal
monthly meeting to review the preceding month’s RTR incidents, which may lead to further follow
up with Participants.
Emergency conditions
Emergency conditions affect the operation of the RTR system, the RTR system application or its
infrastructure, or the overall safety, soundness and efficiency of the RTR system.
The President may, with prior notice to the Bank of Canada and in accordance with the
procedures set out in the rules, take certain actions to ensure the safe and efficient operation of
the RTR system,if any of the following occur, :
1. Communications between the RTR system and a Participant are interrupted;
2. The ability of the RTR system to receive, send or otherwise process payment messages or
```
to clear and settle RTR payment obligations is impaired; or
```
3. The safe and efficient operation of the RTR system is placed into question or any other
emergency affects its operations.
In response to an emergency situation, the President may direct Participants to take certain
action including, but not limited to:
24
Shared
```
● Not sending RTR Payment Messages;
```
```
● Not sending Settlement Instructions to RTR Clearing and Settlement; and
```
● To take any other action that may be necessary to ensure the safe and efficient operation
of the system or to ensure the continued processing of payment messages or clearance
and settlement of RTR payment obligations.
RTR exceptions and returns
The RTR Rules outline exception handling and return procedures applicable to RTR Payment
Obligations exchanged in the RTR Exchange and settled in RTR Clearing and Settlement.
Exception handling
Payments that are exchanged, cleared and settled in the RTR are final and irrevocable between
Participants. However, where certain exceptional circumstances exist, a Receiving Participant is
relieved of its obligation to make the amount of an RTR Payment Message available to the payee
within 60 seconds.
These exceptional circumstances include:
1. Errors: The RTR Payment Message is a duplicate, or it contains an error or omission.
2. Foreign currency amount: The RTR Payment Message identifies the payee by a foreign
```
currency (non-Canadian dollar) account number and chooses not to convert the amount
```
into Canadian dollars.
3. Malicious or harmful content: There are reasonable grounds to believe that the RTR
Payment Message contains malicious or harmful content.
4. Events beyond control: Where a Receiving Participant cannot make the amount of the
RTR Payment Message available due to a technical malfunction or other event that is
beyond the reasonable control of the Participant, directly impairs the functioning of the
Participant’s operating systems and procedures.
5. Restrictions: A restriction has been imposed by the Receiving Participant, an order of
court or by the Payee.
25
Shared
```
In these situations (with the exception of events beyond the control of the participant), the
```
Receiving Participant must initiate a return of the amount of the RTR Payment Message with the
appropriate return reason, prior to crediting the Payee.
Returns
If a Participant has made the funds available to the Payee, the funds are considered final and
irrevocable except under one of the following circumstances:
```
● Errors have occurred;
```
```
● It is an unauthorized RTR Payment;
```
```
● It is the result of Authorized RTR Fraud; or
```
```
● It was made available prior to awareness of certain restrictions (the Payee is deceased, or
```
```
the amount must be removed in order to comply with law or order of a court).
```
Where these circumstances have been identified, the Receiving Participant may return the
amount of the RTR Payment Message. Such return must be initiated as soon as reasonably
practicable in accordance with the return procedures set out in the rules.
For clarity, nothing in the Rules precludes any person from exercising its rights or seeking
recourse outside of the Rules.
Return requests
A Sending Participant may request a return within 60 calendar days from the date the RTR
Payment Message was exchanged. A return may be requested by the Payor, due to processing
errors, end-user errors, Authorized RTR Payment Fraud, or Unauthorized RTR Payments.
A Receiving Participant that receives a return request must respond within 10 calendar days of
the receipt of the request with its acceptance, rejection, or a request for extension in accordance
with the rules. Responses, alongside required information, must be sent to the designated
payment returns contact of the requesting Sending Participant. The Receiving Participant may
also request additional information.
A Receiving Participant that elects to return the amount as a result of a request by or as
authorized by the Payee must initiate a return within 90 calendar days following the receipt of the
original RTR Payment Message. The return must be initiated in accordance with procedures
26
Shared
agreed upon with the Sending Participant. Information in respect of the original RTR Payment
Message and the reason for the return must be provided.
Claims or complaints
Participants must have policies and procedures in place to address claims or complaints relating
to processing and end-user errors, Unauthorized RTR Payments and Authorized RTR Payment
Fraud. The policies and procedures must set out the Participant’s obligations to its clients,
```
including its obligation to investigate claims of exceptions; the obligations of its clients as either
```
```
Payee or Payor; the circumstances of reimbursement or requesting a return of funds; and
```
processes for escalation.
Participants are required to have procedures for escalating claims and complaints relating to
situations of exceptions, where a Payor or Payee disputes the actions or decisions of a
Participant. As part of these escalation processes, Participants are required to be a member of an
external complaints body. An external complaints body is defined in the RTR rules as an
organization that is independent of the Participant that deals with payor and payee complaints
relating to exceptions that have been disputed. The Ombudsman for Banking and Investment
Services is the external complaints body for many financial institutions in Canada, and is also
available to payment service providers. In some cases, this may be the Participant’s regulator.
This grants a Participant’s clients with access to an independent dispute resolution service that
provides an impartial review of escalated claims or complaints. Participants must ensure that its
clients are aware of the escalation procedures.
Each Participant has the obligation to cooperate with other Participants investigations of the
exceptions and cooperate to return funds as soon as reasonably practicable, where appropriate.
Participants may investigate claims or complaints initiated by Payors and Payees relating to
these exceptions in a timely manner. Subject to the RTR By-law and rules, Participants may take
any action it deems appropriate in the circumstances, including submitting a return request and
reimbursing the Sending Participant.
In the event of an error, Participants must correct errors promptly upon receipt of notification or
discovery of such an error in accordance with the terms and conditions established with the
Payor or Payee. Where appropriate, reimbursement may be provided.
27
Shared
RTR fraud management
Payments Canada’s fraud approach
Payments Canada has developed a fraud management strategy to protect Participants and end
users from payment fraud. Payments Canada’s fraud policies and rules are grounded in its public
policy duties to promote the efficiency, safety, and soundness of Canada’s national payment
systems. These fraud policies and rules also reflect the Bank of Canada’s risk management
standards for PPS. Fraud undermines both system resilience and public trust, and addressing it is
central to Payments Canada’s role in maintaining a stable and trusted infrastructure.
Strategic objectives of the RTR fraud strategy
The RTR fraud strategy is based on five strategic pillars:
1. Risk approach: Establish clear thresholds and performance indicators to detect and
respond to participant- or system-level fraud risk.
2. Prevention and security: Ensure Participants have strong customer authentication,
onboarding controls and fraud detection services.
3. Detection and monitoring: Utilize centralized analytics to assess the risk of RTR
transactions in real time.
4. Investigation and response: Enable coordinated action between Participants and system
services when fraud is suspected or confirmed.
5. Continuous enhancement: Refine services and rules over time based on feedback,
evolving threats and operational experience.
These pillars support a proactive and flexible framework that balances innovation in payments
with the need to manage risk.
28
Shared
Third-party fraud service providers
Participants may choose to use a third-party provider for certain services, such as Confirmation
of Payee. Participants remain fully responsible for ensuring that any third-party implementation
maintains compliance with RTR rules and supports system-wide interoperability.
In the future, the potential for third-party providers to support additional centralized fraud services
may be explored, subject to appropriate governance, performance standards, and risk
management considerations.
Participant fraud requirements
To enable real-time risk detection and fraud prevention, Payments Canada is introducing four
centralized services that will be mandatory for all Participants. Each centralized fraud service is
designed to provide actionable insights and data to Participants, without replacing or assuming
responsibility for fraud decisions. The goal is to enhance existing fraud controls and enable a
consistent, system-level approach to identifying and managing risk.
In addition to their own systems, Participants are required to use centralized fraud services as
part of their participation in the RTR. These services, Confirmation of Payee, Central Risk List,
Central Fraud Analytics and Central Fraud Reporting will be integrated into each Participant’s
fraud management processes. Collectively, these services support a coordinated, system-wide
approach to identifying, assessing, and responding to fraud risks.
Fraud management requirements are set out in the RTR rules and supporting documents.
Payments Canada develops these rules and maintains responsibility for compliance oversight of
the RTR rules. All Participants are required to comply with these rules, and updates may be
introduced as RTR system needs evolve or threats emerge.
Below details the centralized fraud services and related Participant requirements.
Centralized fraud services
Central Risk List
The Central Risk List is a shared database of account identifiers and fraud-related attributes that
have been flagged by Participants as either suspected or confirmed fraud. Contributions to the list
29
Shared
are required in near real-time from Participants. The list enables Participants to identify high-risk
accounts before processing a transaction and supports collective fraud detection across the RTR
system.
Participants must manage their contributions to the Central Risk List to maintain the service’s
accuracy and effectiveness. This includes:
● Providing accurate, complete and timely information to ensure the list remains current and
useful for all Participants.
● Having internal criteria and decision-making processes for when to flag an account or
request changes to existing entries. Having processes is key to maintaining trust in the
shared data.
● Proactively maintaining entries, including updating statuses from suspected to confirmed
when appropriate, or requesting removal when a fraud case is resolved or disproven.
Central Fraud Analytics
Central Fraud Analytics assesses the likelihood that a payment is fraudulent before it is entered
into the RTR system. A numerical score is generated for each payment message, based on inputs
such as account history, transaction characteristics, and cross-references with the Central Risk
List. Participants are required to receive and assess this score before allowing a transaction to
proceed and must report the outcome to Payments Canada. These outcomes help refine and
improve the scoring model over time.
Every payment introduced into the RTR must be assessed using Central Fraud Analytics.
Participants must:
● Ingest and review the fraud score provided before the payment is entered into the RTR
system. This score offers an evidence-based estimate of the payment’s fraud risk.
● Make and document a risk-based decision about whether to approve, reject or investigate
further.
30
Shared
● Report the outcome of the decision back to the system so the model can be continuously
improved. This feedback loop helps the Central Fraud Analytics evolve in response to new
fraud behaviours and improves performance over time.
Central Fraud Reporting
Central Fraud Reporting enables Participants to submit monthly reports summarizing authorized
and unauthorized fraud activity. The data supports a system-wide view of fraud trends and
provides insights into risks both at the individual participant level and across the entire RTR
system. Reports are used to monitor performance against thresholds and identify emerging
issues that may require intervention.
The Central Fraud Reporting service provides Payments Canada with essential insights into fraud
trends. Participants must:
```
● Include quantitative data (e.g., volume and value of fraudulent transactions).
```
● Ensure accuracy and consistency in reporting by implementing internal controls and
validation processes.
Confirmation of Payee
Confirmation of Payee helps ensure payments are sent to the intended recipient. When a Payor
enters the payee’s name and account information, the system checks whether the name provided
matches the name registered with the receiving account. If the names don’t match, or only
partially match, the Payor is alerted before the payment goes through. This added layer of
verification helps reduce misdirected payments and protects against fraudsters who try to trick
people into sending money to the wrong account.
Confirmation of Payee is a fraud prevention service designed to reduce misdirected payments or
fraud. Participants must:
● Implement a Confirmation of Payee service to enable account verification for all personal
account payments, allowing clients to verify that the recipient’s name matches their
intended payee before sending funds.
● Contribute required data to support a Confirmation of Payee Service.
31
Shared
● Participants must clearly inform payors of the risks of proceeding when a Confirmation of
Payee notification indicates a mismatch or cannot confirm account details. Despite the
warning, payors must be given the option to continue with the transaction.
Internal fraud control standards
Participants must maintain strong internal fraud controls that are tailored to their own risk profiles
but meet a common minimum standard. These controls include:
● Authenticating payors before sending a payment, using multi-factor authentication or
another method with equivalent security. This is essential to ensure that the person
authorizing a payment is actually the account holder, reducing the risk of unauthorized
RTR payments.
● Having clear internal processes to investigate and respond to fraud indicators, such as a
customer reporting account takeover. Participants can leverage Payments Canada’s rules
on holding and rejecting payments in exceptional circumstances.
● Regularly reviewing and updating fraud controls to keep up with new risks, technologies,
and fraud tactics. Participants are expected to refine their processes over time based on
lessons learned and emerging threats.
Reporting and timeliness
In addition to the reporting functionality of the Central Fraud Analytics, participants are required to
submit detailed fraud reporting data to Payments Canada on a monthly basis.
```
● Reports must be submitted by the seventh (7th) calendar day of each month and include
```
both authorized and unauthorized fraud, whether successful or attempted.
● The data must reflect transactions initiated by the Participant and any non-participant that
they provide services to.
● Reports must be accurate and complete, using the templates and submission processes.
32
Shared
Contracts with non-participants
If a Participant provides RTR services to a client institution that is not itself a Participant, it must
ensure that the entity complies with RTR fraud rules. Contracts must:
● Include fraud control expectations that align with RTR rules.
● Require participation in centralized services where applicable, including fraud reporting
and data sharing.
● Give the RTR participant the right to suspend or terminate service if the entity poses a
fraud risk or fails to comply with RTR rules.
Fraud monitoring
In addition to rule compliance, Payments Canada will set specific thresholds to monitor the
amount of fraud happening at the transaction level. These thresholds help identify when fraud
volumes are getting too high, so that early action can be taken.
Monitoring these levels helps to highlight potential issues, encourages best practices across the
RTR system, and supports ongoing efforts to reduce fraud. If a participant’s fraud volumes
surpass established thresholds, they may be required to investigate the underlying causes and
implement corrective actions. Responses may range from collaborative support and monitoring,
to more formal remediation plans, and in some cases, potential restrictions on participation,
depending on the severity and persistence of the issue. The intent remains focused on
accountability and strengthening the system as a whole.
Next steps
Payments Canada invites members, stakeholders and all other interested parties to provide
comments regarding the proposals and the draft RTR By-law by July 2, 2025, to
consultation@payments.ca.
Payments Canada will consider any comments, questions or concerns from responses to the
proposals set out in this paper and incorporate appropriate policies into by-law and rule
amendments, working with its member and stakeholder committees.
33
Shared
Appendices
APPENDIX I - BANK OF CANADA’S RTR SETTLEMENT ACCOUNT POLICY
APPENDIX II - DRAFT RTR BY-LAW
APPENDIX III- DRAFT RTR RULES 1 TO 14
RTR Rule 1 - Interpretation
RTR Rule 2 - General
RTR Rule 3 - Points of Contact
RTR Rule 4 - Participant Access
RTR Rule 5 - Connection service providers, third-party exchanges & competitive
service providers
RTR Rule 6 - RTR Exchange
RTR Rule 7 - Exceptions and Returns
RTR Rule 8 - Clearing, settlement, funding, defunding & interest
RTR Rule 9 - Participant & system incident
RTR Rule 10 - Remittance information
RTR Rule 11 - Cross border arrangements
RTR Rule 12 - Suspension, revocation & reinstatement
RTR Rule 13 - Fraud management
RTR Rule 14 - RTR FIN lookup database
34
Shared