/*!
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { INode, ISidebarContext } from '@nextcloud/files'

import { subscribe } from '@nextcloud/event-bus'
import { getSidebarActions, getSidebarTabs } from '@nextcloud/files'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import logger from '../logger.ts'
import { useActiveStore } from './active.ts'

export const useSidebarStore = defineStore('sidebar', () => {
	const activeTab = ref<string>()
	const isOpen = ref(false)
	const currentNode = ref<INode>()

	const activeStore = useActiveStore()
	const hasContext = computed(() => !!(currentNode.value && activeStore.activeFolder && activeStore.activeView))
	const currentContext = computed<ISidebarContext | undefined>(() => {
		if (!hasContext.value) {
			return
		}
		return {
			node: currentNode.value!,
			folder: activeStore.activeFolder!,
			view: activeStore.activeView!,
		}
	})

	const currentActions = computed(() => currentContext.value ? getActions(currentContext.value) : [])
	const currentTabs = computed(() => currentContext.value ? getTabs(currentContext.value) : [])

	/**
	 * Open the sidebar for a given node and optional tab ID.
	 *
	 * @param node - The node to display in the sidebar.
	 * @param tabId - Optional ID of the tab to activate.
	 */
	function open(node: INode, tabId?: string) {
		const activeStore = useActiveStore()
		if (!(node && activeStore.activeFolder && activeStore.activeView)) {
			throw new Error('Cannot open sidebar because the active folder or view is not set.')
		}

		const newTabs = getTabs({
			node,
			folder: activeStore.activeFolder,
			view: activeStore.activeView,
		})

		if (tabId && !newTabs.find(({ id }) => id === tabId)) {
			logger.warn(`Cannot open sidebar tab '${tabId}' because it is not available for the current context.`)
			activeTab.value = newTabs[0]?.id
		} else {
			activeTab.value = tabId ?? newTabs[0]?.id
		}
		isOpen.value = true
		currentNode.value = node
	}

	/**
	 * Close the sidebar.
	 */
	function close() {
		isOpen.value = false
		currentNode.value = undefined
	}

	/**
	 * Get the available tabs for the sidebar.
	 * If a context is provided, only tabs enabled for that context are returned.
	 *
	 * @param context - Optional context to filter the available tabs.
	 */
	function getTabs(context?: ISidebarContext) {
		let tabs = getSidebarTabs()
		if (context) {
			tabs = tabs.filter((tab) => tab.enabled(context))
		}
		return tabs.sort((a, b) => a.order - b.order)
	}

	/**
	 * Get the available actions for the sidebar.
	 * If a context is provided, only actions enabled for that context are returned.
	 *
	 * @param context - Optional context to filter the available actions.
	 */
	function getActions(context?: ISidebarContext) {
		let actions = getSidebarActions()
		if (context) {
			actions = actions.filter((tab) => tab.enabled(context))
		}
		return actions.sort((a, b) => a.order - b.order)
	}

	/**
	 * Set the active tab in the sidebar.
	 *
	 * @param tabId - The ID of the tab to activate.
	 */
	function setActiveTab(tabId: string) {
		if (!currentTabs.value.find(({ id }) => id === tabId)) {
			throw new Error(`Cannot set sidebar tab '${tabId}' because it is not available for the current context.`)
		}
		activeTab.value = tabId
	}

	// update the current node if updated
	subscribe('files:node:updated', (node: INode) => {
		if (node.source === currentNode.value?.source) {
			currentNode.value = node
		}
	})

	return {
		activeTab,
		currentActions,
		currentContext,
		currentNode,
		currentTabs,
		hasContext,
		isOpen,

		open,
		close,
		getActions,
		getTabs,
		setActiveTab,
	}
})
