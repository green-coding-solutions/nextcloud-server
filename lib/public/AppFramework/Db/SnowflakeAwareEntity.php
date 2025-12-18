<?php

declare(strict_types=1);
/**
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
namespace OCP\AppFramework\Db;

use OCP\AppFramework\Attribute\Consumable;
use OCP\DB\Types;
use OCP\Server;
use OCP\Snowflake\ISnowflakeDecoder;
use OCP\Snowflake\ISnowflakeGenerator;
use OCP\Snowflake\Snowflake;

/**
 * Entity with snowflake support
 *
 * @since 33.0.0
 */
#[Consumable(since: '33.0.0')]
abstract class SnowflakeAwareEntity extends Entity {
	/** @var string $id */
	public $id;

	protected ?Snowflake $snowflake = null;

	/** @var array<string, \OCP\DB\Types::*> */
	private array $_fieldTypes = ['id' => Types::STRING];

	/**
	 * Automatically creates a snowflake ID
	 */
	#[\Override]
	public function setId(): void {
		if (empty($this->id)) {
			$this->id = Server::get(ISnowflakeGenerator::class)->nextId();
			$this->markFieldUpdated('id');
		}
	}

	/**
	 * @psalm-suppress InvalidReturnStatement
	 * @psalm-suppress InvalidReturnType
	 */
	#[\Override]
	public function getId(): string {
		return $this->id;
	}

	public function getCreatedAt(): ?\DateTimeImmutable {
		return $this->getSnowflake()?->getCreatedAt();
	}

	public function getSnowflake(): ?Snowflake {
		if (empty($this->id)) {
			return null;
		}

		if ($this->snowflake === null) {
			$this->snowflake = Server::get(ISnowflakeDecoder::class)->decode($this->id);
		}

		return $this->snowflake;
	}
}
