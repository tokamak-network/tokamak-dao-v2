# Tokamak DAO V1 Contract Architecture

## 1. 전체 시스템 구조

```mermaid
graph LR
    subgraph External["외부"]
        USER["👤 사용자 / L2 Operator"]
        DCO["🔑 DAOCommitteeOwner<br/>관리자 직접 설정"]
    end

    subgraph Governance["거버넌스"]
        DCP["📌 DAOCommitteeProxy<br/>단일 진입점 · Storage 보유"]
        DCV1["DAOCommittee_V1<br/>로직 구현체"]
        DAM["DAOAgendaManager<br/>안건 · 투표 · 실행"]
        DV["DAOVault<br/>TON/WTON 트레저리"]
    end

    subgraph Candidates["후보자 시스템"]
        CF["CandidateFactory"]
        CAND["Candidate ×N<br/>오퍼레이터별 1개"]
    end

    subgraph Staking["스테이킹 인프라"]
        DM["DepositManager<br/>WTON 예치/출금"]
        SM["SeigManager<br/>시뇨리지 · Coinage"]
        L2R["Layer2Registry"]
    end

    USER -->|"approveAndCall · createCandidate"| DCP
    DCO -.->|"직접 설정"| DCP
    DCP ===|"delegatecall"| DCV1
    DCV1 --> DAM
    DCV1 --> DV
    DCV1 -->|"deploy"| CF
    CF --> CAND
    CAND -->|"castVote · changeMember"| DCP
    CAND -.->|"totalStaked 조회"| SM
    DCV1 --> L2R
    USER -->|"deposit WTON"| DM
    DM --> SM

    style DCP fill:#4A90D9,stroke:#2C5F8A,color:#fff
    style DCV1 fill:#7B68EE,stroke:#5B48CE,color:#fff
    style DAM fill:#E8A838,stroke:#C88818,color:#fff
    style DV fill:#50C878,stroke:#30A858,color:#fff
    style CF fill:#FF6B6B,stroke:#DD4B4B,color:#fff
    style SM fill:#DDA0DD,stroke:#BB80BB,color:#333
    style DCO fill:#FF4444,stroke:#CC2222,color:#fff
```

## 2. Proxy 구조

V1은 **Custom Transparent Proxy** 패턴을 사용합니다. EIP-1967이 아닌 일반 storage 변수에 구현체 주소를 저장합니다.

### 2-1. Proxy 호출 흐름

```mermaid
sequenceDiagram
    participant User as 사용자
    participant Proxy as DAOCommitteeProxy<br/>0xDD9f...C26
    participant Impl as DAOCommittee_V1<br/>0xdF2e...815

    Note over Proxy: Storage 보유<br/>━━━━━━━━━━━━<br/>_implementation<br/>pauseProxy<br/>ton, daoVault, ...<br/>candidates[], members[]<br/>_candidateInfos

    User->>Proxy: castVote(agendaID, vote, comment)
    Note over Proxy: fallback() 실행
    alt pauseProxy == true
        Proxy-->>User: revert
    else pauseProxy == false
        Proxy->>Impl: delegatecall(calldata)
        Note over Impl: Proxy의 Storage를<br/>읽고/쓰는 로직 실행
        Impl-->>Proxy: returndata
        Proxy-->>User: returndata
    end
```

### 2-2. Proxy Storage Layout

Proxy와 구현체가 **동일한 Storage Layout**을 공유해야 합니다. `StorageStateCommittee`를 양쪽이 상속하여 이를 보장합니다.

```mermaid
graph TB
    subgraph Storage["Storage Layout (StorageStateCommittee)"]
        direction TB
        S0["slot 0: ton"]
        S1["slot 1: daoVault"]
        S2["slot 2: agendaManager"]
        S3["slot 3: candidateFactory"]
        S4["slot 4: layer2Registry"]
        S5["slot 5: seigManager"]
        S6["slot 6: candidates[]"]
        S7["slot 7: members[]"]
        S8["slot 8: maxMember"]
        S9["slot 9: _candidateInfos mapping"]
        S10["slot 10: quorum"]
        S11["slot 11: activityRewardPerSecond"]
    end

    subgraph ProxyOnly["Proxy 전용"]
        P1["_implementation"]
        P2["pauseProxy"]
        P3["AccessControl roles"]
    end

    subgraph ImplOnly["구현체 전용"]
        I1["로직 함수만 보유"]
        I2["자체 Storage 사용 안 함"]
    end

    DCP["DAOCommitteeProxy"] --> Storage
    DCP --> ProxyOnly
    DCV1["DAOCommittee_V1"] --> Storage
    DCV1 --> ImplOnly

    style Storage fill:#FFF3CD,stroke:#DAA520,color:#333
    style ProxyOnly fill:#D1ECF1,stroke:#6AAFE6,color:#333
    style ImplOnly fill:#D4EDDA,stroke:#5CB85C,color:#333
    style DCP fill:#4A90D9,stroke:#2C5F8A,color:#fff
    style DCV1 fill:#7B68EE,stroke:#5B48CE,color:#fff
```

### 2-3. Proxy 업그레이드 흐름

```mermaid
graph LR
    ADMIN["Admin<br/>(DEFAULT_ADMIN_ROLE)"]
    DCP["DAOCommitteeProxy"]
    OLD["DAOCommittee<br/>0xd1A3...b8e6<br/>(이전 구현체)"]
    NEW["DAOCommittee_V1<br/>0xdF2e...815<br/>(새 구현체)"]

    ADMIN -->|"upgradeTo(newImpl)"| DCP
    DCP -.->|"_implementation (이전)"| OLD
    DCP ==>|"_implementation (현재)"| NEW

    style DCP fill:#4A90D9,stroke:#2C5F8A,color:#fff
    style OLD fill:#999,stroke:#666,color:#fff
    style NEW fill:#7B68EE,stroke:#5B48CE,color:#fff
    style ADMIN fill:#E8A838,stroke:#C88818,color:#fff
```

### 2-4. 다중 Proxy 구조

V1에는 3개의 Proxy 패턴이 존재합니다:

```mermaid
graph TB
    subgraph CommitteeProxy["DAOCommittee Proxy"]
        CP["DAOCommitteeProxy<br/>0xDD9f...C26"]
        CI["DAOCommittee_V1<br/>0xdF2e...815"]
        CP -.->|delegatecall| CI
    end

    subgraph FactoryProxy["CandidateFactory Proxy"]
        FP["CandidateFactoryProxy<br/>0x9fc7...5d7c"]
        FI["CandidateFactory<br/>0xc5eb...3ffb"]
        FP -.->|delegatecall| FI
    end

    subgraph CandidateProxies["Candidate Proxies (×N)"]
        CPN["CandidateProxy #1..N<br/>(오퍼레이터별 배포)"]
        CII["Candidate<br/>0x1a8f...0a3<br/>(공유 구현체)"]
        CPN -.->|delegatecall| CII
    end

    CP -->|"deploy()"| FP
    FP -->|"new CandidateProxy()"| CPN

    style CP fill:#4A90D9,stroke:#2C5F8A,color:#fff
    style FP fill:#FF6B6B,stroke:#DD4B4B,color:#fff
    style CPN fill:#50C878,stroke:#30A858,color:#fff
    style CI fill:#7B68EE,stroke:#5B48CE,color:#fff
    style FI fill:#FF9999,stroke:#DD7777,color:#333
    style CII fill:#90EE90,stroke:#60BE60,color:#333
```

> **특이사항**: EIP-1967 표준 슬롯이 아닌 일반 `address internal _implementation` 변수를 사용합니다. 이로 인해 Etherscan 등의 도구에서 자동 구현체 감지가 되지 않을 수 있습니다.

## 3. 상속 구조

```mermaid
graph BT
    SSC["StorageStateCommittee<br/>━━━━━━━━━━━━━━<br/>ton, daoVault, agendaManager<br/>candidateFactory, seigManager<br/>layer2Registry<br/>candidates[], members[]<br/>maxMember, quorum<br/>_candidateInfos mapping<br/>activityRewardPerSecond"]

    ISSC["IStorageStateCommittee<br/>━━━━━━━━━━━━━━<br/>CandidateInfo struct"]

    AC["AccessControl<br/>(OpenZeppelin)"]

    DCP["DAOCommitteeProxy<br/>━━━━━━━━━━━━━━<br/>_implementation<br/>pauseProxy<br/>fallback() → delegatecall"]

    DC["DAOCommittee<br/>━━━━━━━━━━━━━━<br/>거버넌스 로직 전체"]

    DCV1["DAOCommittee_V1<br/>━━━━━━━━━━━━━━<br/>+ _oldCandidateInfos<br/>+ createCandidate(memo, operator)<br/>+ setBurntAmountAtDAO"]

    SSC -->|"inherits"| ISSC
    DCP -->|"inherits"| SSC
    DCP -->|"inherits"| AC
    DC -->|"inherits"| SSC
    DC -->|"inherits"| AC
    DCV1 -->|"extends"| DC

    style SSC fill:#FFD700,stroke:#DAA520,color:#333
    style DCP fill:#4A90D9,stroke:#2C5F8A,color:#fff
    style DC fill:#9370DB,stroke:#7350BB,color:#fff
    style DCV1 fill:#7B68EE,stroke:#5B48CE,color:#fff
```

## 4. 안건(Agenda) 라이프사이클

```mermaid
stateDiagram-v2
    [*] --> NOTICE : approveAndCall() - 100 TON 소각

    NOTICE --> VOTING : castVote() 호출 (공지 16일 후)

    VOTING --> WAITING_EXEC : YES ≥ quorum (ACCEPT)
    VOTING --> ENDED_REJECT : NO ≥ maxMember-quorum+1 (REJECT)
    VOTING --> ENDED_DISMISS : 투표 기간 만료 (DISMISS)

    WAITING_EXEC --> EXECUTED : executeAgenda() (7일 이내)
    WAITING_EXEC --> ENDED_EXPIRED : 실행 기한 초과

    state ENDED_REJECT {
        [*] --> Rejected
    }
    state ENDED_DISMISS {
        [*] --> Dismissed
    }
    state ENDED_EXPIRED {
        [*] --> Expired
    }
```

## 5. 스테이킹 → 거버넌스 연결

```mermaid
flowchart LR
    subgraph Staking["스테이킹 레이어"]
        A["사용자 WTON 예치"] --> B["DepositManager"]
        B -->|"onDeposit()"| C["SeigManager"]
        C -->|"mint"| D["Coinage Token<br/>(per Layer2)"]
        D -->|"factor 자동 증가<br/>(시뇨리지 복리)"| D
    end

    subgraph Governance["거버넌스 레이어"]
        E["Candidate Contract"]
        F["changeMember(slot)"]
        G["Committee Member<br/>(1인 1표)"]
        H["castVote()"]
    end

    D -->|"totalStaked() =<br/>coinage.totalSupply()"| E
    E -->|"totalStaked > 현 멤버"| F
    F -->|"성공 시"| G
    G --> H

    style A fill:#87CEEB,stroke:#5BA3CF,color:#333
    style D fill:#DDA0DD,stroke:#BB80BB,color:#333
    style G fill:#50C878,stroke:#30A858,color:#fff
```

## 6. 안건 생성 상세 흐름

```mermaid
sequenceDiagram
    participant User as 사용자
    participant TON as TON Token
    participant DCP as DAOCommitteeProxy
    participant DC as DAOCommittee_V1
    participant DAM as DAOAgendaManager

    User->>TON: approveAndCall(proxy, 100 TON, data)
    TON->>DCP: onApprove(owner, spender, 100 TON, data)
    DCP->>DC: delegatecall → onApprove()

    Note over DC: data 디코딩:<br/>(targets[], noticePeriod,<br/>votingPeriod, atomicExecute,<br/>functionBytecodes[])

    Note over DC: 보안 필터:<br/>claimTON/claimWTON/claimERC20<br/>셀렉터 차단

    DC->>DC: payCreatingAgendaFee()<br/>100 TON → address(1) 소각
    DC->>DAM: newAgenda(targets, notice, voting, atomic, bytecodes)
    DAM-->>DC: agendaID 반환

    Note over DAM: 안건 생성됨<br/>status: NOTICE<br/>result: PENDING
```

## 7. 투표 → 실행 상세 흐름

```mermaid
sequenceDiagram
    participant OP as Operator (EOA)
    participant CAND as Candidate Contract
    participant DCP as DAOCommitteeProxy
    participant DC as DAOCommittee_V1
    participant DAM as DAOAgendaManager
    participant TARGET as Target Contract

    OP->>CAND: castVote(agendaID, YES, "comment")
    CAND->>DCP: castVote(agendaID, YES, "comment")
    DCP->>DC: delegatecall

    Note over DC: 검증: msg.sender가<br/>후보자의 Candidate 컨트랙트인지

    DC->>DAM: castVote(agendaID, member, YES)

    Note over DAM: 첫 투표 시:<br/>NOTICE → VOTING 전환<br/>현재 members[] 스냅샷

    DAM-->>DC: 투표 기록 완료

    Note over DC: quorum 체크:<br/>YES >= quorum?<br/>→ ACCEPT + WAITING_EXEC

    Note right of DC: 실행 단계 (통과 후)

    OP->>DCP: executeAgenda(agendaID)
    DCP->>DC: delegatecall
    DC->>DAM: canExecuteAgenda(agendaID)?
    DAM-->>DC: true

    loop 각 target에 대해
        DC->>TARGET: target.call(functionBytecode)
        TARGET-->>DC: success
    end

    DC->>DAM: setExecutedAgenda(agendaID)
```

## 8. 핵심 데이터 구조

```mermaid
classDiagram
    class CandidateInfo {
        address candidateContract
        uint256 indexMembers
        uint128 memberJoinedTime
        uint128 rewardPeriod
        uint128 claimedTimestamp
    }

    class Agenda {
        uint256 createdTimestamp
        uint256 noticeEndTimestamp
        uint256 votingPeriodInSeconds
        uint256 votingStartedTimestamp
        uint256 votingEndTimestamp
        uint256 executableLimitTimestamp
        uint256 executedTimestamp
        uint256 countingYes
        uint256 countingNo
        uint256 countingAbstain
        AgendaStatus status
        AgendaResult result
        address[] voters
        bool executed
    }

    class AgendaExecutionInfo {
        address[] targets
        bytes[] functionBytecodes
        bool atomicExecute
        uint256 executeStartFrom
    }

    class Voter {
        bool isVoter
        bool hasVoted
        uint256 vote
    }

    class AgendaStatus {
        <<enumeration>>
        NONE
        NOTICE
        VOTING
        WAITING_EXEC
        EXECUTED
        ENDED
    }

    class AgendaResult {
        <<enumeration>>
        PENDING
        ACCEPT
        REJECT
        DISMISS
    }

    Agenda --> AgendaStatus
    Agenda --> AgendaResult
    Agenda --> Voter : voters mapping
    Agenda --> AgendaExecutionInfo : execution data
```

## 9. 메인넷 배포 주소 요약

| 컨트랙트 | 주소 | 역할 |
|---------|------|------|
| **DAOCommitteeProxy** | `0xDD9f0cCc044B0781289Ee318e5971b0139602C26` | 프록시 (진입점) |
| **DAOCommittee** | `0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb` | 기본 구현체 |
| **DAOCommittee_V1** | `0xdF2eCda32970DB7dB3428FC12Bc1697098418815` | 최신 구현체 |
| **DAOAgendaManager** | `0xcD4421d082752f363E1687544a09d5112cD4f484` | 안건 관리 |
| **DAOVault** | `0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303` | 트레저리 |
| **CandidateFactory** | `0xc5eb1c5ce7196bdb49ea7500ca18a1b9f1fa3ffb` | 후보자 배포 |
| **CandidateFactoryProxy** | `0x9fc7100a16407ee24a79c834a56e6eca555a5d7c` | 팩토리 프록시 |
| **DAOCommitteeOwner** | `0xe070fFD0E25801392108076ed5291fA9524c3f44` | 관리자 (sudo) |
| **Candidate** (impl) | `0x1a8f59017e0434efc27e89640ac4b7d7d194c0a3` | 후보자 구현체 |
| **SeigManager** | `0x710936500aC59e8551331871Cbad3D33d5e0D909` | 시뇨리지 |
| **Layer2Registry** | `0x0b3E174A2170083e770D5d4Cf56774D221b7063e` | L2 등록소 |
| **TON** | `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5` | 네이티브 토큰 |
| **WTON** | `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` | Wrapped TON |
