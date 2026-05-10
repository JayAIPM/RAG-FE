import { defineStore } from 'pinia'
import { ref } from 'vue'
import { knowledgeApi } from '@/api/knowledge'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const knowledgeList = ref([])
  const currentKnowledge = ref(null)
  const pagination = ref({ page: 1, pageSize: 10, total: 0 })

  async function fetchKnowledgeList(params = {}) {
    const data = await knowledgeApi.getList({ ...pagination.value, ...params })
    knowledgeList.value = data.list || []
    pagination.value.total = data.total || 0
    return data
  }

  async function createKnowledge(data) {
    const result = await knowledgeApi.create(data)
    return result
  }

  async function updateKnowledge(id, data) {
    const result = await knowledgeApi.update(id, data)
    return result
  }

  async function deleteKnowledge(id) {
    const result = await knowledgeApi.delete(id)
    return result
  }

  async function getKnowledgeById(id) {
    const data = await knowledgeApi.getById(id)
    currentKnowledge.value = data
    return data
  }

  function setCurrentKnowledge(knowledge) {
    currentKnowledge.value = knowledge
  }

  return {
    knowledgeList,
    currentKnowledge,
    pagination,
    fetchKnowledgeList,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    getKnowledgeById,
    setCurrentKnowledge
  }
})
